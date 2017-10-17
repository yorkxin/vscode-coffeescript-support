import * as CoffeeScript from 'coffeescript'
import * as Nodes from 'coffeescript/lib/coffeescript/nodes'

import { readFileByURI } from "../utils/fileReader"

import { DocumentSymbolParams, SymbolInformation, SymbolKind, Range } from "vscode-languageserver"

export default function documentSymbol(documentSymbolParams: DocumentSymbolParams): SymbolInformation[] {
  let tree: Nodes.Block
  let src = readFileByURI(documentSymbolParams.textDocument.uri)

  try {
    tree = CoffeeScript.nodes(src)
  } catch (error) {
    return []
  }

  return getSymbolsFromBlock(tree)
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
    symbolInformation = symbolInformation.concat(getSymbolsFromBlock(classNode.body, className))
  }

  return symbolInformation
}

function getSymbolsFromBlock(block: Nodes.Block, container?: string): SymbolInformation[] {
  let symbolInformation: SymbolInformation[] = []

  block.expressions.forEach(node => {
    if (node instanceof Nodes.Value) {
      node.traverseChildren(false, node => {
        if (node instanceof Nodes.Assign) {
          symbolInformation = symbolInformation.concat(getSymbolsFromAssign(node, "", container))
        }

        return true
      })
    }

    if (node instanceof Nodes.Assign) {
      symbolInformation = symbolInformation.concat(getSymbolsFromAssign(node, "", container))
    }

    if (node instanceof Nodes.Class) {
      symbolInformation = symbolInformation.concat(getSymbolsFromClass(node))
    }

    return true
  })

  return symbolInformation
}

function getSymbolsFromObj(objNode: Nodes.Obj, prefix: string = "", container?: string): SymbolInformation[] {
  let symbolInformation: SymbolInformation[] = []

  objNode.properties.forEach(property => {
    symbolInformation = symbolInformation.concat(getSymbolsFromAssign(property, prefix, container))
  })

  return symbolInformation
}

function getSymbolsFromAssign(assign: Nodes.Assign, prefix?: string, container?: string): SymbolInformation[] {
  let symbolInformation: SymbolInformation[] = []

  if (assign.variable.base instanceof Nodes.Literal) {
    let name: string;

    if (assign.variable.base instanceof Nodes.ThisLiteral) {
      name = _formatThisPropertyParam(assign.variable);
    } else if (assign.variable.base instanceof Nodes.Literal) {
      name = assign.variable.base.value;
    }

    if (prefix !== '') {
      name = `${prefix}.${name}`;
    }

    let symbolKind = _determineSymbolKindByRHS(assign.value);

    if (assign.value instanceof Nodes.Code) {
      name = `${name}(${_formatParamList(assign.value.params)})`;
    }

    symbolInformation.push(SymbolInformation.create(name, symbolKind, _createRange(assign.locationData), null, container));

    if (assign.value instanceof Nodes.Value && assign.value.base instanceof Nodes.Obj) {
      symbolInformation = symbolInformation.concat(getSymbolsFromObj(assign.value.base, name, container));
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
      return `@${firstProperty.name.value}`
    }
  }

  return "?"
}

function _determineSymbolKindByRHS(rhs: Nodes.Value | Nodes.Code): SymbolKind {
  if (rhs instanceof Nodes.Value) {
    return SymbolKind.Property
  } else if (rhs instanceof Nodes.Code) {
    return SymbolKind.Function
  } else {
    return SymbolKind.String
  }
}
