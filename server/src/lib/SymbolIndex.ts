import * as fs from "fs";
import * as Datastore from "nedb";
import { Parser } from "./Parser"
import { SymbolInformation } from "vscode-languageserver";
import Uri from 'vscode-uri'

interface SymbolInformationEntry {
  searchableName: string;
  locationDescriptor: string;
  symbolInformation: SymbolInformation;
}

export class SymbolIndex {
  db: Datastore;
  dbFilename: string
  parser: Parser

  constructor(dbFilename: string) {
    this.dbFilename = dbFilename
    this.parser = new Parser({ includeClosure: false })
    this.db = new Datastore({ filename: this.dbFilename, autoload: true });
  }

  indexFile(uriOrPath: Uri | string): Promise<void> {
    const { fsPathWithoutScheme, locationURI } = this._normalizeAsURI(uriOrPath)

    console.time(`parse ${fsPathWithoutScheme}`)

    const symbols = this.parser.getExportedSymbolsFromSource(fs.readFileSync(fsPathWithoutScheme, 'utf-8'))

    console.timeEnd(`parse ${fsPathWithoutScheme}`)

    symbols.forEach(symbol => {
      symbol.location.uri = locationURI;
    })

    return this._removeSymbolsOfFile(locationURI)
      .then(() => this._saveSymbols(symbols, locationURI))
  }

  async removeFile(uriOrPath: Uri | string) {
    const { locationURI } = this._normalizeAsURI(uriOrPath)
    return this._removeSymbolsOfFile(locationURI)
  }

  find(query: string): Promise<SymbolInformation[]> {
    const queryInLowercase = query.toLowerCase()
    const dbQuery = {
      '$where': function(this: SymbolInformationEntry) {
        return this.searchableName.includes(queryInLowercase)
      }
    }

    return new Promise((resolve, reject) => {
      this.db.loadDatabase(() => {
        // TODO: should we sort?
        this.db.find(dbQuery)
          .exec((err: Error, docs: SymbolInformationEntry[]) => {
            if (err) { reject(err) }
            resolve(docs.map(entry => entry.symbolInformation))
          })
      })
    })
  }

  async destroy() {
    return new Promise((resolve, reject) => {
      fs.unlink(this.dbFilename, (err) => {
        if (err !== null) { reject(err) };
        resolve()
      });
    })
  }

  _normalizeAsURI(uriOrPath: Uri | string | any): { fsPathWithoutScheme: string, locationURI: string } {
    let uri: Uri;

    if (Uri.isUri(uriOrPath)) {
      uri = uriOrPath;
    } else if (typeof uriOrPath === 'string') {
      uri = Uri.parse(`file://${uriOrPath}`);
    } else if (typeof uriOrPath.path === 'string') {
      uri = Uri.parse(`file://${uriOrPath.path}`);
    } else if (typeof uriOrPath.fsPath === 'string') {
      uri = Uri.parse(uriOrPath.fsPath);
    } else {
      throw new TypeError(`Cannot normalize anything other than Uri or string: ${JSON.stringify(uriOrPath)} (constructor: ${uriOrPath.constructor})`)
    }

    let locationURI = uri.toString(true /* do not URIencode */);

    if (!locationURI.startsWith('file:')) {
      throw new TypeError(`Y U NO scheme?? ${JSON.stringify(uri)}`)
    }

    return {
      fsPathWithoutScheme: uri.path,
      locationURI: uri.toString(true /* do not URIencode */)
    }
  }

  _saveSymbols(symbols: SymbolInformation[], fsPath: string): Promise<void> {
    if (!fsPath.startsWith('file:')) {
      throw new TypeError(`fsPath must be staring with file:// but it is: ${fsPath}`)
    }
    console.log("saving", symbols.length, "symbols for", fsPath)
    return new Promise((resolve, reject) => {
      console.time(`addIndex ${fsPath}`)
      const symbolEntries = symbols.map(symbol => this._serializeSymbol(symbol))

      this.db.insert(symbolEntries, (err) => {
        console.timeEnd(`addIndex ${fsPath}`)
        if (err) { reject(err) }
        resolve()
      })
    })
  }

  _removeSymbolsOfFile(fsPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.remove({ "symbolInformation.location.uri": fsPath }, { multi: true }, (err, numRemoved) => {
        if (err) {
          reject(err);
        }

        if (numRemoved > 0) {
          console.log('Removed', numRemoved, 'symbols for', fsPath)
        }

        resolve();
      });
    });
  }

  _serializeSymbol(symbolInformation: SymbolInformation): SymbolInformationEntry {
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
