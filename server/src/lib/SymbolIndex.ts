import * as fs from "fs";
import * as Loki from "lokijs";
import { Parser } from "./Parser"
import { SymbolInformation } from "vscode-languageserver";
import Uri from 'vscode-uri'

export class SymbolIndex {
  db: Loki;
  symbols: Loki.Collection
  parser: Parser

  constructor() {
    this.db = new Loki("");
    this.symbols = this.db.addCollection("symbols", {
      indices: ['nameForSearch']
    })
    this.parser = new Parser()
  }

  indexFiles(uris: Array<Uri>): Thenable<void> {
    console.log("indexFiles:", uris.length, 'files')
    console.time("indexFiles")
    return Promise.all(uris.map(uri => this.indexFile(uri)))
      .then(() => console.timeEnd("indexFiles"))
  }

  indexFile(uri: Uri | string): Thenable<void> {
    return new Promise((resolve) => {
      let path: string, fsPath: string

      if (uri instanceof Uri) {
        path = uri.path
        fsPath = uri.fsPath
      } else if (typeof uri === 'string') {
        path = uri
        fsPath = `file://${path}`
      }

      this.parser.getSymbolsFromSource(fs.readFileSync(path, 'utf-8')).forEach((documentSymbol) => {
        this.symbols.insert({
          name: documentSymbol.name,
          nameForSearch: documentSymbol.name.toLocaleLowerCase(),
          kind: documentSymbol.kind,
          location: {
            uri: fsPath,
            range: documentSymbol.location.range
          },
          containerName: documentSymbol.containerName
        })
      })

      resolve()
    })
  }

  find(query: string) {
    return this.symbols.find({ nameForSearch: { '$contains': query }})
      .map((doc: SymbolInformation) => SymbolInformation.create(doc.name, doc.kind, doc.location.range, doc.location.uri, doc.containerName))
  }
}
