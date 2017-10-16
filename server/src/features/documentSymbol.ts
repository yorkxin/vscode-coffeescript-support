import * as CoffeeScript from 'coffeescript'
import * as Nodes from 'coffeescript/lib/coffeescript/nodes'

import { readFileByURI } from "../utils/fileReader"

import { DocumentSymbolParams, SymbolInformation, SymbolKind, Range } from "vscode-languageserver"

export default function documentSymbol(documentSymbolParams: DocumentSymbolParams): SymbolInformation[] {
  let tree: Nodes.Base
  let src = readFileByURI(documentSymbolParams.textDocument.uri)

  try {
    tree = CoffeeScript.nodes(src)
  } catch (error) {
    return []
  }

  let symbolInformation: SymbolInformation[] = [];

  tree.traverseChildren(true, (node) => {
    try {
      if (node instanceof Nodes.Class) {
        symbolInformation = symbolInformation.concat(getSymbolsFromClass(node))
      }
      return true;
    } catch (error) {
      console.log("error in traverseChildren", node.locationData)
    } finally {
      return true
    }
  });
  return symbolInformation;
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

  classNode.body.eachChild(node => {
    if (node instanceof Nodes.Value) {
      if (node.base instanceof Nodes.Obj) {
        node.base.properties.forEach(property => {
          if (property.variable.base instanceof Nodes.Literal) {
            let name: string

            if (property.variable.base instanceof Nodes.ThisLiteral) {
              name = _formatThisPropertyParam(property.variable)
            } else if (property.variable.base instanceof Nodes.Literal) {
              name = property.variable.base.value
            }

            let symbolKind = _determineSymbolKindByRHS(property.value)

            if (property.value instanceof Nodes.Code) {
              name = `${name}(${_formatParamList(property.value.params)})`
            }

            symbolInformation.push(SymbolInformation.create(name, symbolKind, _createRange(property.locationData), null, className))
          }
        })
      }
    }

    return true
  })

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
