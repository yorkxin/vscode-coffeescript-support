import * as fs from "fs";
import * as Loki from "lokijs";
import { documentSymbol } from "./features/documentSymbol"
import { SymbolInformation } from "vscode-languageserver";
import Uri from 'vscode-uri'

export class SymbolIndex {
  db: Loki;
  symbols: Loki.Collection

  constructor() {
    this.db = new Loki("");
    this.symbols = this.db.addCollection("symbols", {
      indices: ['name']
    })
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

      documentSymbol(fs.readFileSync(path, 'utf-8')).forEach((documentSymbol) => {
        this.symbols.insert({
          name: documentSymbol.name,
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
    const pattern = new RegExp(`${query}`, 'i')
    return this.symbols.find({ name: { '$regex': pattern }})
      .map((doc: SymbolInformation) => SymbolInformation.create(doc.name, doc.kind, doc.location.range, doc.location.uri, doc.containerName))
  }
}
