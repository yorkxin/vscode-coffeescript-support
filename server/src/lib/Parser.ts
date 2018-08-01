import * as CoffeeScript from 'coffeescript'
import * as Nodes from 'coffeescript/lib/coffeescript/nodes'

import { SymbolInformation, SymbolKind, Range, Diagnostic, DiagnosticSeverity } from "vscode-languageserver"

interface SymbolMetadata {
  name: string,
  kind: SymbolKind
}

const OBJECT_LITERAL_CONTAINER_NAME = '[anonymous]';
const EXPORTS_MATCHER = /^(module\.)?exports(\..+)?( = (.+))?$/;
const DEFAULT_OPTIONS = { includeClosure: true };

export class Parser {
  includeClosure: boolean;

  constructor({ includeClosure } = DEFAULT_OPTIONS) {
    this.includeClosure = includeClosure;
  }

  validateSource(src: string): Diagnostic[]  {
    try {
      this._parse(src)
      return []
    } catch (error) {
      const startLine = error.location.first_line
      const startChar = error.location.first_column
      let endLine = error.location.last_line
      const endChar = error.location.last_column

      // In some cases error.location.last_line is undefined but actually points to the same line.
      if (endLine === undefined) {
        endLine = startLine
      }

      const range = Range.create(startLine, startChar, endLine, endChar)

      return [{
        severity: DiagnosticSeverity.Error,
        range: range,
        message: `${range.start.line+1}:${range.start.character+1} ${error.message}`,
        source: 'coffee'
      }]
    }
  }

  getSymbolsFromSource(src: string): SymbolInformation[] {
    try {
      return this.getSymbolsFromBlock(this._parse(src))
    } catch (error) {
      console.error(error)
      return []
    }
  }

  getExportedSymbolsFromSource(src: string): SymbolInformation[] {
    try {
      const symbols = this.getSymbolsFromBlock(this._parse(src));

      const moduleExports = symbols.filter(symbol => {
        if (symbol.name.match(EXPORTS_MATCHER)) {
          return true;
        }

        if (symbol.containerName && symbol.containerName.match(EXPORTS_MATCHER)) {
          return true;
        }

        return false;
      })

      if (moduleExports.length === 0) {
        // No exports. Assume global variables (tranditional web app).
        return symbols.filter(symbol => !symbol.containerName);
      }

      // Expand more module.exports thorugh assignments
      const expandedSymbols: SymbolInformation[] = [];

      moduleExports.filter(exported => exported.name.includes(' = '))
        .forEach(exported => {
          const identifier = exported.name.split(" = ")[1];
          const identifierPrefix = `${identifier}.`;

          symbols.forEach(symbol => {
            if (symbol.name === identifier) {
              expandedSymbols.push(symbol);
            } else if (symbol.containerName && (symbol.containerName === identifier || symbol.containerName.startsWith(identifierPrefix))) {
              expandedSymbols.push(symbol);
            }
          })
        })

      return moduleExports.concat(expandedSymbols)
        .sort((a, b) => a.location.range.start.character - b.location.range.start.character)
        .sort((a, b) => a.location.range.start.line - b.location.range.start.line)
        ;

    } catch (error) {
      console.error(error)
      return []
    }
  }

  _parse(src: string): Nodes.Block {
    return CoffeeScript.nodes(src)
  }

  getSymbolsFromClass(classNode: Nodes.Class): SymbolInformation[] {
    let symbolInformation: SymbolInformation[] = []
    let className = formatClassIdentifier(classNode);

    symbolInformation.push(SymbolInformation.create(className, SymbolKind.Class, _createRange(classNode.locationData), null))

    if (classNode.body instanceof Nodes.Block) {
      symbolInformation = symbolInformation.concat(this.getSymbolsFromBlock(classNode.body, { name: className, kind: SymbolKind.Class }))
    }

    return symbolInformation
  }

  getSymbolsFromBlock(block: Nodes.Block, container?: SymbolMetadata): SymbolInformation[] {
    if (!this.includeClosure && container && container.kind !== SymbolKind.Class) {
      return [];
    }

    let symbolInformation: SymbolInformation[] = []

    block.expressions.forEach(node => {
      if (node instanceof Nodes.Value) {
        if (node.base instanceof Nodes.Call) {
          node.base.args.forEach(child => {
            if (child instanceof Nodes.Value && child.base instanceof Nodes.Obj) {
              symbolInformation = symbolInformation.concat(this.getSymbolsFromObj(child.base, container))
            }
          })
        } else if (node.base instanceof Nodes.Obj) {
          symbolInformation = symbolInformation.concat(this.getSymbolsFromObj(node.base, container))
        }
      }

      if (node instanceof Nodes.Assign) {
        symbolInformation = symbolInformation.concat(this.getSymbolsFromAssign(node, container))
      }

      if (node instanceof Nodes.Class) {
        symbolInformation = symbolInformation.concat(this.getSymbolsFromClass(node))
      }

      return true
    })

    return symbolInformation
  }

  getSymbolsFromObj(objNode: Nodes.Obj, container?: SymbolMetadata): SymbolInformation[] {
    let symbolInformation: SymbolInformation[] = []

    if (!container) {
      container = {
        kind: SymbolKind.Namespace,
        name: OBJECT_LITERAL_CONTAINER_NAME
      }
    }

    objNode.properties.forEach(property => {
      symbolInformation = symbolInformation.concat(this.getSymbolsFromAssign(property, container))
    })

    return symbolInformation
  }

  getSymbolsFromAssign(assign: Nodes.Assign, container?: SymbolMetadata): SymbolInformation[] {
    let symbolInformation: SymbolInformation[] = []
    let lhs = assign.variable;
    let rhs = assign.value

    if (lhs instanceof Nodes.Value && lhs.base instanceof Nodes.Literal) {
      let symbolMetadata = _getSymbolMetadataByAssignment(lhs, rhs, container)

      let containerName: string = null
      if (container) {
        containerName = container.name
      }

      symbolInformation.push(SymbolInformation.create(symbolMetadata.name, symbolMetadata.kind, _createRange(assign.locationData), null, containerName));

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

      if (rhs instanceof Nodes.Value && rhs.base instanceof Nodes.Obj) {
        symbolInformation = symbolInformation.concat(this.getSymbolsFromObj(rhs.base, nextContainer));
      } else if (rhs instanceof Nodes.Code) {
        symbolInformation = symbolInformation.concat(this.getSymbolsFromBlock(rhs.body, nextContainer));
      }
    }

    return symbolInformation
  }
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
    return formatAssignee(param.name, null)
  }

  return "???"
}

function formatAssignee(variable: Nodes.Value, value?: Nodes.Value | Nodes.Class): string {
  let literals: Nodes.Literal[] = []

  if (variable.base instanceof Nodes.Literal) {
    literals.push(variable.base)
  }

  let properties = variable.properties as (Nodes.Access | Nodes.Assign)[]

  if (properties instanceof Array) {
    properties.forEach(property => {
      if (property instanceof Nodes.Access && property.name instanceof Nodes.Literal) {
        literals.push(property.name)
      }
    })
  }

  let tokens: string[] = []

  literals.forEach((literal, index) => {
    if (literal instanceof Nodes.ThisLiteral) {
      tokens.push('@')
    } else if (literal.value === "prototype") {
      tokens.push('::')
    } else {
      if (index !== 0) {
        // check previous
        let previous = tokens[index - 1]
        if (!(previous === '@' || previous === '::')) {
          tokens.push('.')
        }
      }

      tokens.push(literal.value)
    }
  })

  if (value instanceof Nodes.Value && value.base instanceof Nodes.IdentifierLiteral) {
    tokens.push(" = ");
    tokens.push(value.base.value);
  } else if (value instanceof Nodes.Class) {
    tokens.push(" = ");
    tokens.push(formatClassIdentifier(value));
  }

  return tokens.join('')
}

function _getSymbolMetadataByAssignment(lhs: Nodes.Value, rhs: Nodes.Value | Nodes.Code | Nodes.Call | Nodes.Class, container?: SymbolMetadata): SymbolMetadata {
  let name;

  if (rhs instanceof Nodes.Value || rhs instanceof Nodes.Class) {
    name = formatAssignee(lhs, rhs);
  } else {
    name = formatAssignee(lhs, null);
  }

  let kind: SymbolKind

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

function formatClassIdentifier(classNode: Nodes.Class) {
  if (classNode.variable instanceof Nodes.Value && classNode.variable.base instanceof Nodes.Literal) {
    return classNode.variable.base.value
  } else {
    return "(Anonymous Class)"
  }
}
