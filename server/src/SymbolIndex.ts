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
    let start: Date, end: Date
    const files = this._glob(root, PATTERN)
    start = new Date()
    console.debug("index start")

    return Promise.all(files.map(file => this.indexFile(file)))
      .then(() => {
        end = new Date()
        let duration = (end.getTime() - start.getTime()) / 1000
        console.debug("index done, duration=", duration, "seconds")
      })
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
      .map((doc: SymbolInformation) => SymbolInformation.create(doc.name, doc.kind, doc.location.range, doc.containerName))
  }

  _glob(dir: string, pattern: string): string[] {
    console.debug((new Date()).toISOString(), "glob start")
    const files = glob.sync(pattern, { cwd: dir, realpath: true })
    console.debug((new Date()).toISOString(), "glob end")
    console.debug("found files:", files.length)
    return files
  }
}
