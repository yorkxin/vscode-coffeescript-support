import * as fs from "fs";
import * as Datastore from "nedb";
import { Parser } from "./Parser"
import { SymbolInformation } from "vscode-languageserver";
import Uri from 'vscode-uri'

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
    const symbols = this.parser
      .getSymbolsFromSource(fs.readFileSync(path, 'utf-8'))
      .map(symbol => this._serializeSymbol(symbol, fsPath))
    console.timeEnd(`parse ${path}`)

    console.time(`addIndex ${path}`)
    return this._saveSymbols(symbols).then(() => {
      console.timeEnd(`addIndex ${path}`)
    })
  }

  find(query: string): Promise<SymbolInformation[]> {
    const dbQuery = { '$where': function(this:SymbolInformation) { return this.name.includes(query) } }

    return new Promise((resolve, reject) => {
      this.db.loadDatabase(() => {
        this.db.find(dbQuery, (err: Error, docs: SymbolInformation[]) => {
          if (err) { reject(err) }
          resolve(docs)
        })
      })
    })
  }

  _saveSymbols(symbols: SymbolInformation[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.insert(symbols, (err) => {
        if (err) { reject(err) }
        resolve()
      })
    })
  }

  _serializeSymbol(symbol: SymbolInformation, fsPath: string) {
    symbol.location.uri = fsPath
    return symbol;
  }
}
