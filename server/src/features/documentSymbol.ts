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
        return getSymbolsFromClass(node)
      }
      else if (node instanceof Nodes.Assign) {
        if (node.value) {
          let name = String(node.variable.base.value);
          if (node.value instanceof Nodes.Code) {
            let kind: SymbolKind;
            if (node.variable.base.value === 'constructor') {
              kind = SymbolKind.Constructor;
            }
            else {
              kind = SymbolKind.Method;
            }
            let params = (node.value.params || []).map(param => param.name.value).join(', ');
            let arrow = node.value.bound ? "=>" : "->";
            name = `${name}(${params}) ${arrow}`;
            let range = _createRange(node.locationData);
            symbolInformation.push(SymbolInformation.create(name, kind, range));
          }
          else if (node.variable.base instanceof Nodes.ThisLiteral) {
            let kind = SymbolKind.Property;
            node.variable.properties.forEach((access) => {
              name = `@${access.name.value}`;
              let range = _createRange(access.locationData);
              symbolInformation.push(SymbolInformation.create(name, kind, range));
            });
          }
          else if (node.variable.base instanceof Nodes.PropertyName) {
            let kind = SymbolKind.Property;
            let range = _createRange(node.locationData);
            symbolInformation.push(SymbolInformation.create(name, kind, range));
          }
          else {
            let kind = SymbolKind.Variable;
            let range = _createRange(node.locationData);
            symbolInformation.push(SymbolInformation.create(name, kind, range));
          }
          if (name === "ho") {
            console.log(node.context);
          }
        }
      }
      return true;
    } catch (error) {
      console.log(node.locationData)
      throw error
    }
  });
  return symbolInformation;
};

function getSymbolsFromClass(classNode: Nodes.Class) {
  let symbolInformation: SymbolInformation[] = []
  let className = String(classNode.variable.base.value)

  symbolInformation.push(SymbolInformation.create(className, SymbolKind.Class, _createRange(classNode.locationData)))

  classNode.body.traverseChildren(false, node => {
    if (node instanceof Nodes.Value) {

    }
  })

}

function _createRange(locationData: any): Range {
	return Range.create(locationData.first_line, locationData.first_column, locationData.last_line, locationData.last_column)
}
