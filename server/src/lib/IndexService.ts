import * as path from "path";
import * as fs from "fs";
import * as cp from "child_process";
import { SymbolIndex } from "./SymbolIndex";

const INDEXER_CLI_TS_PATH = path.resolve(__dirname, "..", "bin", "indexer.ts");
const INDEXER_CLI_JS_PATH = path.resolve(__dirname, "..", "bin", "indexer.js");

export class IndexService {
  symbolIndex: SymbolIndex
  dbFilename: string;

  constructor(dbFilename: string) {
    this.dbFilename = dbFilename
    this.symbolIndex = new SymbolIndex(this.dbFilename)
    console.log("Symbols DB:", this.dbFilename)
  }

  async find(query: string) {
    if (query.length > 0) {
      return this.symbolIndex.find(query)
    } else {
      return []
    }
  }

  async indexFilesInBackground(uris: string[]): Promise<any> {
    console.log(new Date(), 'index with sub processes')

    let modulePath: string = null;
    let args = ["-d", this.dbFilename];

    if (fs.existsSync(INDEXER_CLI_JS_PATH)) {
      console.log(new Date(), 'will spawn js indexer')
      modulePath = INDEXER_CLI_JS_PATH;
    } else if (fs.existsSync(INDEXER_CLI_TS_PATH)) {
      // FIXME: this is a workaround for unit tests (Node.js only), but after we changed to fork, it does not work anymore.
      console.warn(new Date(), 'using ts-node to spawn process')
      modulePath = INDEXER_CLI_TS_PATH;
      args.unshift("-r", "ts-node/register");
    } else {
      throw new Error('Indexer does not exist.')
    }

    const promise = new Promise((resolve, reject) => {
      const proc = cp.fork(modulePath, args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
      });

      proc.on('message', (params) => {
        if (params.done) {
          console.info(new Date(), 'Indexer done')
          proc.kill()
          resolve()
        } else {
          throw new TypeError(`Unknown message from child: ${params}`)
        }
      })

      proc.on('exit', (code) => {
        if (code !== 0) { reject('Indexer exited with non-zero code') }
        console.info(new Date(), 'Indexer exited')
        resolve()
      })

      proc.on('uncaughtException', (err) => {
        console.error(new Date(), 'Indexer Failed')
        console.error(new Date(), err.stack);
        reject(err);
      });

      proc.on('error', (err) => {
        console.error(new Date(), 'Indexer Failed')
        console.error(new Date(), err.stack);
        reject(err);
      });

      proc.send({ files: uris });
    });

    return promise;
  }

  async indexFilesInForeground(uris: string[]): Promise<any> {
    console.log('index in foreground')
    return Promise.all(uris.map((uri: string) => this.symbolIndex.indexFile(uri)))
  }

  async removeFiles(uris: string[]) {
    return Promise.all(uris.map((uri: string) => this.symbolIndex.removeFile(uri)))
  }

  async shutdown() {
    return this.symbolIndex.destroy()
  }
}
