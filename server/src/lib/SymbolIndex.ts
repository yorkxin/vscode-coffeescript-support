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
    this.parser = new Parser()
    this.db = new Datastore({ filename: this.dbFilename, autoload: true });
  }

  indexFile(uri: Uri | string): Promise<void> {
    let path: string, fsPath: string

    if (uri instanceof Uri) {
      path = uri.path
      fsPath = uri.fsPath
    } else if (typeof uri === 'string') {
      path = uri
      fsPath = `file://${path}`
    }

    console.time(`parse ${path}`)

    const symbols = this.parser.getExportedSymbolsFromSource(fs.readFileSync(path, 'utf-8'))

    console.timeEnd(`parse ${path}`)

    symbols.forEach(symbol => {
      symbol.location.uri = fsPath
    })

    return this._saveSymbols(symbols, fsPath)
  }

  find(query: string): Promise<SymbolInformation[]> {
    const dbQuery = { '$where': function(this: SymbolInformationEntry) { return this.searchableName.includes(query) } }

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

  _saveSymbols(symbols: SymbolInformation[], fsPath: string): Promise<void> {
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
