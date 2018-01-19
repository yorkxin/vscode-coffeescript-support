import { readFileSync } from "fs";
import * as glob from "glob";
import * as Loki from "lokijs";
import { documentSymbol } from "./features/documentSymbol"
import { SymbolInformation } from "vscode-languageserver";

const PATTERN = "**/*.coffee";

export class SymbolIndex {
  db: Loki;
  symbols: Loki.Collection

  constructor() {
    this.db = new Loki("");
    this.symbols = this.db.addCollection("symbols", {
      indices: ['name']
    })
  }

  indexDirectory(root: string): Thenable<void> {
    const files = this._glob(root, PATTERN)

    console.log("index start")
    console.time("index")
    return Promise.all(files.map(file => this.indexFile(file)))
      .then(() => console.timeEnd("index"))
  }

  indexFile(path: string): Thenable<void> {
    return new Promise((resolve) => {
      documentSymbol(readFileSync(path, 'utf-8')).forEach((documentSymbol) => {
        this.symbols.insert({
          name: documentSymbol.name,
          kind: documentSymbol.kind,
          location: {
            uri: `file://${path}`,
            range: documentSymbol.location.range
          },
          containerName: documentSymbol.containerName
        })
      })

      resolve()
    })
  }

  find(query: string) {
    const pattern = new RegExp(`${query}`)
    return this.symbols.find({ name: { '$regex': pattern }})
      .map((doc: SymbolInformation) => SymbolInformation.create(doc.name, doc.kind, doc.location.range, doc.location.uri, doc.containerName))
  }

  _glob(dir: string, pattern: string): string[] {
    console.log("glob start")
    console.time("glob")
    const files = glob.sync(pattern, { cwd: dir, realpath: true })
    console.timeEnd("glob")
    console.log("found files:", files.length)
    return files
  }
}
