import * as CoffeeScript from 'coffeescript'
import * as Nodes from 'coffeescript/lib/coffeescript/nodes'

import * as fs from 'fs'
import * as URL from 'url'

import { DocumentSymbolParams, SymbolInformation, SymbolKind, Range } from "vscode-languageserver"

export default function documentSymbol(documentSymbolParams: DocumentSymbolParams): SymbolInformation[] {
  let path = URL.parse(documentSymbolParams.textDocument.uri).path;
  let tree = CoffeeScript.nodes(fs.readFileSync(path, 'utf-8'))
  let symbolInformation: SymbolInformation[] = [];
  tree.traverseChildren(true, (node) => {
    if (node instanceof Nodes.Class) {
      let name = String(node.variable.base.value);
      let range = _createRange(node.locationData);
      symbolInformation.push(SymbolInformation.create(name, SymbolKind.Class, range));
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
  });
  return symbolInformation;
};

function _createRange(locationData: any): Range {
	return Range.create(locationData.first_line, locationData.first_column, locationData.last_line, locationData.last_column)
}
