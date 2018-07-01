import * as path from 'path';
import * as fs from 'fs';
import * as tmp from 'tmp';
import { SymbolKind } from 'vscode-languageserver';

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
      const index = this.index;
      await expect(Promise.all([
        index.indexFile(path.resolve(__dirname, '../../fixtures/globals.coffee')),
        index.indexFile(path.resolve(__dirname, '../../fixtures/sample.coffee'))
      ]))
    });
  });

  describe('#find()', () => {
    async function prepareIndex(index) {
      await index.indexFile(path.resolve(__dirname, '../../fixtures/globals.coffee'));
      await index.indexFile(path.resolve(__dirname, '../../fixtures/sample.coffee'));
      await index.indexFile(path.resolve(__dirname, '../../fixtures/export-1.coffee'));
      await index.indexFile(path.resolve(__dirname, '../../fixtures/export-2.coffee'));

      return index
    }

    const expectedResult1 = {
      name: 'module.exports.Bar',
      kind: SymbolKind.Variable,
      location: {
        range: expect.anything(),
        uri: "file://" + path.resolve(__dirname, '../../fixtures/export-1.coffee'),
      },
    };

    const expectedResult2 = {
      name: 'exports.bar',
      kind: SymbolKind.Namespace,
      location: {
        range: expect.anything(),
        uri: "file://" + path.resolve(__dirname, '../../fixtures/sample.coffee'),
      },
    };

    const expectedResult3 = {
      name: 'Bar',
      kind: SymbolKind.Variable,
      location: {
        range: expect.anything(),
        uri: "file://" + path.resolve(__dirname, '../../fixtures/globals.coffee'),
      },
    };

    test('returns a list of SymbolIndex containing symbols', async () => {
      const index = await prepareIndex(this.index)
      const results = await index.find('bar');

      expect(results).toContainEqual(expectedResult1)
      expect(results).toContainEqual(expectedResult2)
      expect(results).toContainEqual(expectedResult3)
    });

    test('returns a list of SymbolIndex containing symbols (case insensitive)', async () => {
      const index = await prepareIndex(this.index)
      const results = await index.find('BAR');

      expect(results).toContainEqual(expectedResult1)
      expect(results).toContainEqual(expectedResult2)
      expect(results).toContainEqual(expectedResult3)
    });
  });
})
