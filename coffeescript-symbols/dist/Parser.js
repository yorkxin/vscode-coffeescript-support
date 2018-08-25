"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CoffeeScript = require("coffeescript");
const Nodes = require("coffeescript/lib/coffeescript/nodes");
const vscode_languageserver_1 = require("vscode-languageserver");
const OBJECT_LITERAL_CONTAINER_NAME = '[anonymous]';
const EXPORTS_MATCHER = /^(module\.)?exports(\..+)?( = (.+))?$/;
const DEFAULT_OPTIONS = { includeClosure: true };
// TODO: LSP 4.4.0 supports hierarchical DocumentSymbol.
// Reafctor this class so that it does not bind to any interface in `vscode-languageserver`,
// then we can re-shape the results to whatever we want.
class Parser {
    constructor({ includeClosure } = DEFAULT_OPTIONS) {
        this.includeClosure = includeClosure;
    }
    validateSource(src) {
        try {
            this._parse(src);
            return [];
        }
        catch (error) {
            const startLine = error.location.first_line;
            const startChar = error.location.first_column;
            let endLine = error.location.last_line;
            const endChar = error.location.last_column;
            // In some cases error.location.last_line is undefined but actually points to the same line.
            if (endLine === undefined) {
                endLine = startLine;
            }
            const range = vscode_languageserver_1.Range.create(startLine, startChar, endLine, endChar);
            return [{
                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                    range: range,
                    message: `${range.start.line + 1}:${range.start.character + 1} ${error.message}`,
                    source: 'coffee'
                }];
        }
    }
    getSymbolsFromSource(src) {
        try {
            return this.getSymbolsFromBlock(this._parse(src));
        }
        catch (error) {
            console.error(error);
            return [];
        }
    }
    getExportedSymbolsFromSource(src) {
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
            });
            if (moduleExports.length === 0) {
                // No exports. Assume global variables (tranditional web app).
                return symbols.filter(symbol => !symbol.containerName);
            }
            // Expand more module.exports thorugh assignments
            const expandedSymbols = [];
            moduleExports.filter(exported => exported.name.includes(' = '))
                .forEach(exported => {
                const identifier = exported.name.split(" = ")[1];
                const identifierPrefix = `${identifier}.`;
                symbols.forEach(symbol => {
                    if (symbol.name === identifier) {
                        expandedSymbols.push(symbol);
                    }
                    else if (symbol.containerName && (symbol.containerName === identifier || symbol.containerName.startsWith(identifierPrefix))) {
                        expandedSymbols.push(symbol);
                    }
                });
            });
            return moduleExports.concat(expandedSymbols)
                .sort((a, b) => a.location.range.start.character - b.location.range.start.character)
                .sort((a, b) => a.location.range.start.line - b.location.range.start.line);
        }
        catch (error) {
            console.error(error);
            return [];
        }
    }
    _parse(src) {
        return CoffeeScript.nodes(src);
    }
    getSymbolsFromClass(classNode) {
        let symbolInformation = [];
        let className = formatClassIdentifier(classNode);
        symbolInformation.push(vscode_languageserver_1.SymbolInformation.create(className, vscode_languageserver_1.SymbolKind.Class, _createRange(classNode.locationData), undefined));
        if (classNode.body instanceof Nodes.Block) {
            symbolInformation = symbolInformation.concat(this.getSymbolsFromBlock(classNode.body, { name: className, kind: vscode_languageserver_1.SymbolKind.Class }));
        }
        return symbolInformation;
    }
    getSymbolsFromBlock(block, container) {
        if (!this.includeClosure && container && container.kind !== vscode_languageserver_1.SymbolKind.Class) {
            return [];
        }
        let symbolInformation = [];
        block.expressions.forEach(node => {
            if (node instanceof Nodes.Value) {
                if (node.base instanceof Nodes.Call) {
                    node.base.args.forEach(child => {
                        if (child instanceof Nodes.Value && child.base instanceof Nodes.Obj) {
                            symbolInformation = symbolInformation.concat(this.getSymbolsFromObj(child.base, container));
                        }
                    });
                }
                else if (node.base instanceof Nodes.Obj) {
                    symbolInformation = symbolInformation.concat(this.getSymbolsFromObj(node.base, container));
                }
            }
            if (node instanceof Nodes.Assign) {
                symbolInformation = symbolInformation.concat(this.getSymbolsFromAssign(node, container));
            }
            if (node instanceof Nodes.Class) {
                symbolInformation = symbolInformation.concat(this.getSymbolsFromClass(node));
            }
            return true;
        });
        return symbolInformation;
    }
    getSymbolsFromObj(objNode, container) {
        let symbolInformation = [];
        if (!container) {
            container = {
                kind: vscode_languageserver_1.SymbolKind.Namespace,
                name: OBJECT_LITERAL_CONTAINER_NAME
            };
        }
        objNode.properties.forEach(property => {
            symbolInformation = symbolInformation.concat(this.getSymbolsFromAssign(property, container));
        });
        return symbolInformation;
    }
    getSymbolsFromAssign(assign, container) {
        let symbolInformation = [];
        let lhs = assign.variable;
        let rhs = assign.value;
        if (lhs instanceof Nodes.Value && lhs.base instanceof Nodes.Literal) {
            let symbolMetadata = _getSymbolMetadataByAssignment(lhs, rhs, container);
            let containerName;
            if (container) {
                containerName = container.name;
            }
            symbolInformation.push(vscode_languageserver_1.SymbolInformation.create(symbolMetadata.name, symbolMetadata.kind, _createRange(assign.locationData), undefined, containerName));
            let nextContainerName;
            if (container) {
                nextContainerName = `${container.name}.${symbolMetadata.name}`;
            }
            else {
                nextContainerName = symbolMetadata.name;
            }
            let nextContainer = {
                name: nextContainerName,
                kind: symbolMetadata.kind
            };
            if (rhs instanceof Nodes.Value && rhs.base instanceof Nodes.Obj) {
                symbolInformation = symbolInformation.concat(this.getSymbolsFromObj(rhs.base, nextContainer));
            }
            else if (rhs instanceof Nodes.Code) {
                symbolInformation = symbolInformation.concat(this.getSymbolsFromBlock(rhs.body, nextContainer));
            }
        }
        return symbolInformation;
    }
}
exports.Parser = Parser;
function _createRange(locationData) {
    return vscode_languageserver_1.Range.create(locationData.first_line, locationData.first_column, locationData.last_line, locationData.last_column);
}
function _formatParamList(params) {
    return params.map(_formatParam).join(', ');
}
function _formatParam(param) {
    // local variable
    if (param.name instanceof Nodes.IdentifierLiteral) {
        return param.name.value;
    }
    // constructor(@foo)
    if (param.name instanceof Nodes.Value) {
        return formatAssignee(param.name, undefined);
    }
    return "???";
}
function formatAssignee(variable, value) {
    let literals = [];
    if (variable.base instanceof Nodes.Literal) {
        literals.push(variable.base);
    }
    let properties = variable.properties;
    if (properties instanceof Array) {
        properties.forEach(property => {
            if (property instanceof Nodes.Access && property.name instanceof Nodes.Literal) {
                literals.push(property.name);
            }
        });
    }
    let tokens = [];
    literals.forEach((literal, index) => {
        if (literal instanceof Nodes.ThisLiteral) {
            tokens.push('@');
        }
        else if (literal.value === "prototype") {
            tokens.push('::');
        }
        else {
            if (index !== 0) {
                // check previous
                let previous = tokens[index - 1];
                if (!(previous === '@' || previous === '::')) {
                    tokens.push('.');
                }
            }
            tokens.push(literal.value);
        }
    });
    if (value instanceof Nodes.Value && value.base instanceof Nodes.IdentifierLiteral) {
        tokens.push(" = ");
        tokens.push(value.base.value);
    }
    else if (value instanceof Nodes.Class) {
        tokens.push(" = ");
        tokens.push(formatClassIdentifier(value));
    }
    return tokens.join('');
}
function _getSymbolMetadataByAssignment(lhs, rhs, container) {
    let name;
    if (rhs instanceof Nodes.Value || rhs instanceof Nodes.Class) {
        name = formatAssignee(lhs, rhs);
    }
    else {
        name = formatAssignee(lhs, undefined);
    }
    let kind;
    if (rhs instanceof Nodes.Code) {
        name = `${name}(${_formatParamList(rhs.params)})`;
    }
    if (rhs instanceof Nodes.Value) {
        if (rhs.base instanceof Nodes.Obj) {
            kind = vscode_languageserver_1.SymbolKind.Namespace;
        }
        else if (rhs.base instanceof Nodes.Call && rhs.base.variable.base instanceof Nodes.IdentifierLiteral && rhs.base.variable.base.value === 'require') {
            kind = vscode_languageserver_1.SymbolKind.Package;
        }
        else if (lhs instanceof Nodes.ThisLiteral) {
            kind = vscode_languageserver_1.SymbolKind.Property;
        }
        else {
            kind = vscode_languageserver_1.SymbolKind.Variable;
        }
    }
    else if (rhs instanceof Nodes.Code) {
        if (container && container.kind === vscode_languageserver_1.SymbolKind.Class) {
            kind = vscode_languageserver_1.SymbolKind.Method;
        }
        else {
            kind = vscode_languageserver_1.SymbolKind.Function;
        }
    }
    else {
        kind = vscode_languageserver_1.SymbolKind.Variable;
    }
    return { name, kind };
}
function formatClassIdentifier(classNode) {
    if (classNode.variable instanceof Nodes.Value && classNode.variable.base instanceof Nodes.Literal) {
        return classNode.variable.base.value;
    }
    else {
        return "(Anonymous Class)";
    }
}
//# sourceMappingURL=Parser.js.map