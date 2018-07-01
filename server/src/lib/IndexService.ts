import * as path from "path";
import * as cp from "child_process";
import { SymbolIndex } from "./SymbolIndex";

const INDEXER_CLI_PATH = path.resolve(__dirname, "..", "bin", "indexer.ts");

export class IndexService {
  symbolIndex: SymbolIndex
  dbFilename: string;

  constructor(dbFilename: string) {
    this.dbFilename = dbFilename
    this.symbolIndex = new SymbolIndex(this.dbFilename)
    console.debug("Symbols DB:", this.dbFilename)
  }

  async find(query: string) {
    if (query.length > 0) {
      return this.symbolIndex.find(query)
    } else {
      return []
    }
  }

  async indexFilesInBackground(uris: string[]): Promise<any> {
    console.debug(new Date(), 'index with sub processes')

    const args = ["-r", "ts-node/register", INDEXER_CLI_PATH, "-d", this.dbFilename];
    const proc = cp.spawn('node', args, {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    const promise = new Promise((resolve, reject) => {
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
    })

    proc.send({ files: uris })

    return promise;
  }

  async indexFilesInForeground(uris: string[]): Promise<any> {
    console.debug('index in foreground')
    return Promise.all(uris.map((uri: string) => this.symbolIndex.indexFile(uri)))
  }

  async shutdown() {
    return this.symbolIndex.remove()
  }
}
