import * as CoffeeScript from 'coffeescript'
import * as Nodes from 'coffeescript/lib/coffeescript/nodes'

import { readFileByURI } from "../utils/fileReader"

import { DocumentSymbolParams, SymbolInformation, SymbolKind, Range } from "vscode-languageserver"

interface SymbolMetadata {
  name: string,
  kind: SymbolKind
}

export default function documentSymbol(documentSymbolParams: DocumentSymbolParams): SymbolInformation[] {
  try {
    let src = readFileByURI(documentSymbolParams.textDocument.uri)
    return getSymbolsFromBlock(CoffeeScript.nodes(src))
  } catch (error) {
    return []
  }
};

function getSymbolsFromClass(classNode: Nodes.Class): SymbolInformation[] {
  let symbolInformation: SymbolInformation[] = []
  let className: string

  if (classNode.variable instanceof Nodes.Value && classNode.variable.base instanceof Nodes.Literal) {
    className = classNode.variable.base.value
  } else {
    className = "(Anonymous Class)"
  }

  symbolInformation.push(SymbolInformation.create(className, SymbolKind.Class, _createRange(classNode.locationData)))

  if (classNode.body instanceof Nodes.Block) {
    symbolInformation = symbolInformation.concat(getSymbolsFromBlock(classNode.body, { name: className, kind: SymbolKind.Class }))
  }

  return symbolInformation
}

function getSymbolsFromBlock(block: Nodes.Block, container?: SymbolMetadata): SymbolInformation[] {
  let symbolInformation: SymbolInformation[] = []

  block.expressions.forEach(node => {
    if (node instanceof Nodes.Value) {
      if (node.base instanceof Nodes.Call) {
        node.base.args.forEach(child => {
          if (child instanceof Nodes.Value && child.base instanceof Nodes.Obj) {
            symbolInformation = symbolInformation.concat(getSymbolsFromObj(child.base, container))
          }
        })
      } else if (node.base instanceof Nodes.Obj) {
        symbolInformation = symbolInformation.concat(getSymbolsFromObj(node.base, container))
      }
    }

    if (node instanceof Nodes.Assign) {
      symbolInformation = symbolInformation.concat(getSymbolsFromAssign(node, container))
    }

    if (node instanceof Nodes.Class) {
      symbolInformation = symbolInformation.concat(getSymbolsFromClass(node))
    }

    return true
  })

  return symbolInformation
}

function getSymbolsFromObj(objNode: Nodes.Obj, container?: SymbolMetadata): SymbolInformation[] {
  let symbolInformation: SymbolInformation[] = []

  objNode.properties.forEach(property => {
    symbolInformation = symbolInformation.concat(getSymbolsFromAssign(property, container))
  })

  return symbolInformation
}

function getSymbolsFromAssign(assign: Nodes.Assign, container?: SymbolMetadata): SymbolInformation[] {
  let symbolInformation: SymbolInformation[] = []
  let lhs = assign.variable;
  let rhs = assign.value

  if (lhs.base instanceof Nodes.Literal) {
    let symbolMetadata = _getSymbolMetadataByAssignment(lhs, rhs, container)

    let containerName: string = null
    if (container) {
      containerName = container.name
    }

    symbolInformation.push(SymbolInformation.create(symbolMetadata.name, symbolMetadata.kind, _createRange(assign.locationData), null, containerName));

    if (rhs instanceof Nodes.Value && rhs.base instanceof Nodes.Obj) {
      let nextContainerName

      if (container) {
        nextContainerName = `${container.name}.${symbolMetadata.name}`;
      } else {
        nextContainerName = symbolMetadata.name
      }

      let nextContainer: SymbolMetadata = {
        name: nextContainerName,
        kind: symbolMetadata.kind
      }

      symbolInformation = symbolInformation.concat(getSymbolsFromObj(rhs.base, nextContainer));
    }
  }

  return symbolInformation
}

function _createRange(locationData: any): Range {
	return Range.create(locationData.first_line, locationData.first_column, locationData.last_line, locationData.last_column)
}

function _formatParamList(params: Nodes.Param[]): string {
  return params.map(_formatParam).join(', ')
}

function _formatParam(param: Nodes.Param): string {
  // local variable
  if (param.name instanceof Nodes.IdentifierLiteral) {
    return param.name.value
  }

  // constructor(@foo)
  if (param.name instanceof Nodes.Value) {
    return _formatThisPropertyParam(param.name)
  }

  return "???"
}

/**
 * Formats "@foo"
 * @param {Nodes.Value} name
 */
function _formatThisPropertyParam(name: Nodes.Value) {
  if (name.base instanceof Nodes.ThisLiteral) {
    let firstProperty = name.properties[0]
    if (firstProperty instanceof Nodes.Access) {
      if (firstProperty.name.value === "prototype") {
        // @::foo = ->
        return "@"
      } else {
        // @foo = ->
        return `@${firstProperty.name.value}`
      }
    }
  }

  return ""
}

function _getSymbolMetadataByAssignment(lhs: Nodes.Value, rhs: Nodes.Value | Nodes.Code | Nodes.Call, container?: SymbolMetadata): SymbolMetadata {
  let name: string;
  let kind: SymbolKind

  if (lhs.base instanceof Nodes.ThisLiteral) {
    name = _formatThisPropertyParam(lhs);
  } else if (lhs.base instanceof Nodes.Literal) {
    name = lhs.base.value;
  } else {
    name = "(unknown)"
  }

  // TODO: merge this logic with _formatThisPropertyParam
  let possiblePrototypeAccess = lhs.properties[0]
  let possiblePrototypeName = lhs.properties[1]

  if (possiblePrototypeAccess instanceof Nodes.Access && possiblePrototypeName instanceof Nodes.Access) {
    if (possiblePrototypeAccess.name.value === "prototype") {
      name = `${name}::${possiblePrototypeName.name.value}`
    }
  }
  // TODO: /above

  if (rhs instanceof Nodes.Code) {
    name = `${name}(${_formatParamList(rhs.params)})`;
  }

  if (rhs instanceof Nodes.Value) {
    if (rhs.base instanceof Nodes.Obj) {
      kind = SymbolKind.Namespace
    } else if (rhs.base instanceof Nodes.Call && rhs.base.variable.base instanceof Nodes.IdentifierLiteral && rhs.base.variable.base.value === 'require') {
      kind = SymbolKind.Package
    } else if (lhs instanceof Nodes.ThisLiteral) {
      kind = SymbolKind.Property
    } else {
      kind = SymbolKind.Variable
    }
  } else if (rhs instanceof Nodes.Code) {
    if (container && container.kind === SymbolKind.Class) {
      kind = SymbolKind.Method
    } else {
      kind = SymbolKind.Function
    }
  } else {
    kind = SymbolKind.Variable
  }

  return { name, kind }
}
