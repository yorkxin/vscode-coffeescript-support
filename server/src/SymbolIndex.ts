import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import * as nodegit from "nodegit";
import * as Loki from "lokijs";
import { documentSymbol } from "./features/documentSymbol"
import { SymbolInformation } from "vscode-languageserver";

const COFFEE_FILES_PATTERN = "**/*.coffee";

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
    let gitDir = path.join(root, '.git')
    let fileListing: Thenable<string[]>

    if (fs.existsSync(gitDir)) {
      console.log("found a Git Repo")
      fileListing = this._globGitRepo(root)
    } else {
      fileListing = this._globDir(root)
    }

    console.log("ls files start")
    console.time("ls-files")

    return fileListing
      .then(files => {
        console.timeEnd("ls-files")
        console.log("found files:", files.length)
        console.log("index start")
        console.time("index")
        return Promise.all(files.map(file => this.indexFile(file)))
      })
      .then(() => console.timeEnd("index"))
  }

  indexFile(path: string): Thenable<void> {
    return new Promise((resolve) => {
      documentSymbol(fs.readFileSync(path, 'utf-8')).forEach((documentSymbol) => {
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
    const pattern = new RegExp(`${query}`, 'i')
    return this.symbols.find({ name: { '$regex': pattern }})
      .map((doc: SymbolInformation) => SymbolInformation.create(doc.name, doc.kind, doc.location.range, doc.location.uri, doc.containerName))
  }

  _globGitRepo(dir: string): Thenable<string[]> {
    return new Promise((resolve, _) => {
      // let rootPath: string;
      return nodegit.Repository.open(dir)
        .then(repo => {
          // rootPath = repo.path()
          return repo.getHeadCommit()
        })
        .then(head => head.getTree())
        .then(tree => {
            // `walk()` returns an event.
            const files: string[] = []
            const walker = tree.walk();

            walker.on("entry", function(entry) {
              const entryPath = entry.path()
              if (/\.coffee$/.test(entryPath)) {
                files.push(path.join(dir, entryPath))
              }
            });

            walker.on("end", (_: string[]) => {
              resolve(files)
            })

            // Don't forget to call `start()`!
            walker.start()
          })
        })
  }

  _globDir(dir: string): Thenable<string[]> {
    return new Promise((resolve, reject) => {
      glob(COFFEE_FILES_PATTERN, { cwd: dir, realpath: true }, (err, files) => {
        if (err) {
          reject(err)
        } else {
          resolve(files)
        }
      })
    })
  }
}
