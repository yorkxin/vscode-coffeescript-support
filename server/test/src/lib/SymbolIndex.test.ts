import * as path from 'path';
import * as fs from 'fs';
import { SymbolKind } from 'vscode-languageserver';
import * as tmp from 'tmp';

import { SymbolIndex } from '../../../src/lib/SymbolIndex';

describe('SymbolIndex()', () => {
  function createIndex () {
    const tempura = tmp.fileSync({ dir: path.resolve(__dirname, 'tmp') })
    fs.closeSync(tempura.fd);
    return new SymbolIndex(tempura.name);
  }

  function cleanupIndex (index: SymbolIndex) {
    fs.unlinkSync(index.dbFilename);
  }

  beforeEach(() => {
    this.index = createIndex()
  });

  afterEach(() => {
    cleanupIndex(this.index);
  });

  describe('#indexFile()', () => {
    test('works', async () => {
      const index: SymbolIndex = this.index;
      await expect(Promise.all([
        index.indexFile(path.resolve(__dirname, '../../fixtures/globals.coffee')),
        index.indexFile(path.resolve(__dirname, '../../fixtures/sample.coffee'))
      ]))
    });
  });

  describe('#find()', () => {
    test('returns a list of SymbolIndex containing symbols', async () => {
      const index: SymbolIndex = this.index;

      await Promise.all([
        index.indexFile(path.resolve(__dirname, '../../fixtures/globals.coffee')),
        index.indexFile(path.resolve(__dirname, '../../fixtures/sample.coffee')),
        index.indexFile(path.resolve(__dirname, '../../fixtures/export-1.coffee')),
        index.indexFile(path.resolve(__dirname, '../../fixtures/export-2.coffee')),
      ])

      const returned = await index.find('bar')

      expect(returned).toHaveLength(1);
      expect(returned[0].name).toEqual('exports.bar');
      expect(returned[0].kind).toEqual(SymbolKind.Namespace);
      expect(returned[0].location.range).toEqual({ "start": { "character": 0, "line": 87 }, "end": { "character": 23, "line": 87 } })
      expect(returned[0].location.uri).toEqual("file://" + path.resolve(__dirname, '../../fixtures/sample.coffee'))
      expect(returned[0].containerName).toBeUndefined()
    });
  });
})
