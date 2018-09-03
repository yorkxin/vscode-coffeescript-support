import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { SymbolIndex } from 'coffeescript-lsp-core';

const INDEXER_CLI_PATH = path.resolve(__dirname, '../../node_modules/coffeescript-lsp-core/dist/bin/coffeescript-symbol-indexer.js');

export class IndexService {
  public symbolIndex: SymbolIndex;
  public dbFilename: string;
  private indexerProcess: cp.ChildProcess;

  constructor(dbFilename: string) {
    this.dbFilename = dbFilename;
    this.symbolIndex = new SymbolIndex(this.dbFilename);
    console.log('Symbols DB:', this.dbFilename);
  }

  public async find(query: string) {
    if (query.length > 0) {
      return this.symbolIndex.find(query);
    } else {
      return [];
    }
  }

  public async indexFilesInBackground(uris: string[]): Promise<any> {
    console.log(new Date(), 'index with sub processes');

    return new Promise((resolve, reject) => {
      this.indexer.once('message', (params) => {
        if (params.done) {
          resolve();
        }
      });

      this.indexer.send({ files: uris });
    });
  }

  public async indexFilesInForeground(uris: string[]): Promise<any> {
    console.log('index in foreground');
    return Promise.all(uris.map((uri: string) => this.symbolIndex.indexFile(uri)));
  }

  public async removeFiles(uris: string[]) {
    return Promise.all(uris.map((uri: string) => this.symbolIndex.removeFile(uri)));
  }

  public async shutdown() {
    this.stopIndexer();
    return this.symbolIndex.destroy();
  }

  private get indexer(): cp.ChildProcess {
    if (this.indexerProcess) {
      return this.indexerProcess;
    }

    console.info('Starting indexer process...');
    this.indexerProcess = this.startIndexer(INDEXER_CLI_PATH, this.dbFilename);

    this.indexerProcess.on('message', (params) => {
      if (params.done) {
        console.info(new Date(), 'Indexer done');
      } else {
        this.stopIndexer();
        throw new TypeError(`Unknown message from child: ${params}`);
      }
    });

    this.indexerProcess.on('exit', (code) => {
      if (!(code === 0 || code === null)) {
        throw Error(`Indexer exited with non-zero code: ${code}`);
      }

      console.info(new Date(), 'Indexer exited');
      this.stopIndexer();
    });

    this.indexerProcess.on('uncaughtException', (err) => {
      console.error(new Date(), 'Indexer Failed');
      console.error(new Date(), err.stack);
      this.stopIndexer();
    });

    this.indexerProcess.on('error', (err) => {
      console.error(new Date(), 'Indexer Error');
      console.error(new Date(), err.stack);
      this.stopIndexer();
    });

    return this.indexerProcess;
  }

  private startIndexer(cliPath: string, dbFilename: string): cp.ChildProcess {
    const args = ['-d', dbFilename];

    if (!fs.existsSync(cliPath)) {
      throw new Error(`Indexer bin does not exist: ${cliPath}`);
    }

    const proc = cp.fork(cliPath, args, {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    });

    return proc;
  }

  private stopIndexer() {
    if (!this.indexerProcess) {
      console.warn('Trying to stop indexer process but it is not running');
      return;
    }

    this.indexerProcess.kill();
    this.indexerProcess = null;
  }
}
