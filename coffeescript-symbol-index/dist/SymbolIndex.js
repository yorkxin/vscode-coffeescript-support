"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const Datastore = require("nedb");
const coffeescript_symbols_1 = require("coffeescript-symbols");
const vscode_uri_1 = require("vscode-uri");
class SymbolIndex {
    constructor(dbFilename) {
        this.dbFilename = dbFilename;
        this.parser = new coffeescript_symbols_1.Parser({ includeClosure: false });
        this.db = new Datastore({ filename: this.dbFilename, autoload: true });
    }
    indexFile(uriOrPath) {
        const { fsPathWithoutScheme, locationURI } = this._normalizeAsURI(uriOrPath);
        console.time(`parse ${fsPathWithoutScheme}`);
        const symbols = this.parser.getExportedSymbolsFromSource(fs.readFileSync(fsPathWithoutScheme, 'utf-8'));
        console.timeEnd(`parse ${fsPathWithoutScheme}`);
        symbols.forEach(symbol => {
            symbol.location.uri = locationURI;
        });
        return this._removeSymbolsOfFile(locationURI)
            .then(() => this._saveSymbols(symbols, locationURI));
    }
    removeFile(uriOrPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const { locationURI } = this._normalizeAsURI(uriOrPath);
            return this._removeSymbolsOfFile(locationURI);
        });
    }
    find(query) {
        const queryInLowercase = query.toLowerCase();
        const dbQuery = {
            '$where': function () {
                return this.searchableName.includes(queryInLowercase);
            }
        };
        return new Promise((resolve, reject) => {
            this.db.loadDatabase(() => {
                // TODO: should we sort?
                this.db.find(dbQuery)
                    .exec((err, docs) => {
                    if (err) {
                        reject(err);
                    }
                    const entries = docs;
                    resolve(entries.map(entry => entry.symbolInformation));
                });
            });
        });
    }
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fs.unlink(this.dbFilename, (err) => {
                    if (err !== null) {
                        reject(err);
                    }
                    ;
                    resolve();
                });
            });
        });
    }
    _normalizeAsURI(uriOrPath) {
        let uri;
        if (vscode_uri_1.default.isUri(uriOrPath)) {
            uri = uriOrPath;
        }
        else {
            let stringToUse = null;
            if (typeof uriOrPath === 'string') {
                stringToUse = uriOrPath;
            }
            else if (typeof uriOrPath.path === 'string') {
                stringToUse = uriOrPath.path;
            }
            else if (typeof uriOrPath.fsPath === 'string') {
                stringToUse = uriOrPath.fsPath;
            }
            else {
                throw new TypeError(`Cannot normalize anything other than Uri or string: ${JSON.stringify(uriOrPath)} (constructor: ${uriOrPath.constructor})`);
            }
            if (!stringToUse.startsWith('file://')) {
                stringToUse = 'file://' + stringToUse;
            }
            uri = vscode_uri_1.default.parse(stringToUse);
        }
        let locationURI = uri.toString(true /* do not URIencode */);
        if (!locationURI.startsWith('file:')) {
            throw new TypeError(`Y U NO scheme?? ${JSON.stringify(uri)}`);
        }
        return {
            fsPathWithoutScheme: uri.path,
            locationURI: uri.toString(true /* do not URIencode */)
        };
    }
    _saveSymbols(symbols, fsPath) {
        if (!fsPath.startsWith('file:')) {
            throw new TypeError(`fsPath must be staring with file:// but it is: ${fsPath}`);
        }
        console.log("saving", symbols.length, "symbols for", fsPath);
        return new Promise((resolve, reject) => {
            console.time(`addIndex ${fsPath}`);
            const symbolEntries = symbols.map(symbol => this._serializeSymbol(symbol));
            this.db.insert(symbolEntries, (err) => {
                console.timeEnd(`addIndex ${fsPath}`);
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }
    _removeSymbolsOfFile(fsPath) {
        return new Promise((resolve, reject) => {
            this.db.remove({ "symbolInformation.location.uri": fsPath }, { multi: true }, (err, numRemoved) => {
                if (err) {
                    reject(err);
                }
                if (numRemoved > 0) {
                    console.log('Removed', numRemoved, 'symbols for', fsPath);
                }
                resolve();
            });
        });
    }
    _serializeSymbol(symbolInformation) {
        const locationDescriptor = [
            symbolInformation.location.uri,
            symbolInformation.location.range.start.line,
            symbolInformation.location.range.start.character
        ].join(':');
        const searchableName = symbolInformation.name.toLowerCase();
        return {
            locationDescriptor,
            searchableName,
            symbolInformation
        };
    }
}
exports.SymbolIndex = SymbolIndex;
//# sourceMappingURL=SymbolIndex.js.map