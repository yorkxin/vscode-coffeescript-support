import * as path from 'path';
import * as fs from 'fs';
import * as tmp from 'tmp';
import { SymbolKind, SymbolInformation } from 'vscode-languageserver';

import { SymbolIndex } from '../../../src/lib/SymbolIndex';

describe('SymbolIndex()', () => {
  function createIndex () {
    const tempura = tmp.fileSync({ dir: path.resolve(__dirname, 'tmp') })
    fs.closeSync(tempura.fd);
    return new SymbolIndex(tempura.name);
  }

  function cleanupIndex (index: SymbolIndex) {
    // fs.unlinkSync(index.dbFilename);
  }

  beforeEach(() => {
    this.index = createIndex()
  });

  afterEach(() => {
    cleanupIndex(this.index);
  });

  describe('#indexFile()', () => {
    test('works', async () => {
      const index = this.index;
      await expect(Promise.all([
        index.indexFile(path.resolve(__dirname, '../../fixtures/globals.coffee')),
        index.indexFile(path.resolve(__dirname, '../../fixtures/sample.coffee'))
      ]))
    });
  });

  describe('#find()', () => {
    test('returns a list of SymbolIndex containing symbols', async () => {
      const index = this.index;

      await Promise.all([
        index.indexFile(path.resolve(__dirname, '../../fixtures/globals.coffee')),
        index.indexFile(path.resolve(__dirname, '../../fixtures/sample.coffee')),
        index.indexFile(path.resolve(__dirname, '../../fixtures/export-1.coffee')),
        index.indexFile(path.resolve(__dirname, '../../fixtures/export-2.coffee')),
      ])

      const returned = await index.find('bar')

      expect(returned).toHaveLength(5);

      expect(returned).toContainEqual({
        name: 'Bar',
        kind: SymbolKind.Variable,
        location: {
          range: { start: { line: 2, character: 0 }, end: { line: 2, character: 10 } },
          uri: "file://" + path.resolve(__dirname, '../../fixtures/export-1.coffee')
        },
        containerName: undefined
      })

      expect(returned).toContainEqual({
        name: 'module.exports.Bar',
        kind: SymbolKind.Variable,
        location: {
          range: { start: { line: 7, character: 0 }, end: { line: 7, character: 23 } },
          uri: "file://" + path.resolve(__dirname, '../../fixtures/export-1.coffee'),
        },
        containerName: undefined
      })

      expect(returned).toContainEqual({
        name: 'Bar',
        kind: SymbolKind.Variable,
        location: {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
          uri: "file://" + path.resolve(__dirname, '../../fixtures/globals.coffee'),
        },
        containerName: undefined
      })

      expect(returned).toContainEqual({
        name: 'BAR',
        kind: SymbolKind.Variable,
        location: {
          range: { start: { line: 14, character: 2 }, end: { line: 14, character: 12 } },
          uri: "file://" + path.resolve(__dirname, '../../fixtures/sample.coffee'),
        },
        containerName: 'App',
      })

      expect(returned).toContainEqual({
        name: 'exports.bar',
        kind: SymbolKind.Namespace,
        location: {
          range: { start: { line: 87, character: 0 }, end: { line: 87, character: 23 } },
          uri: "file://" + path.resolve(__dirname, '../../fixtures/sample.coffee'),
        },
        containerName: undefined
      })
    });
  });
})
