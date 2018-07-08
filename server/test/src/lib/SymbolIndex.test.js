const path = require('path');
const fs = require('fs');
const tmp = require('tmp');
const { SymbolKind } = require('vscode-languageserver');

const { SymbolIndex } = require('../../../src/lib/SymbolIndex');

describe('SymbolIndex()', () => {
  function createIndex () {
    const tempura = tmp.fileSync({ dir: path.resolve(__dirname, 'tmp') })
    fs.closeSync(tempura.fd);
    return new SymbolIndex(tempura.name);
  }

  /**
   * @param {SymbolIndex} index
   */
  function cleanupIndex (index) {
    fs.unlinkSync(index.dbFilename);
  }

  /**
   * @param {Nedb} db
   * @param {any} query
   */
  async function countPromise(db, query) {
    return new Promise((resolve, reject) => {
      db.count(query, (err, num) => {
        if (err) { reject(err) };
        resolve(num);
      });
    })
  };

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

    test('does not duplicate if index same file twice', async () => {
      /** @type {SymbolIndex} */
      const index = this.index;
      const file = path.resolve(__dirname, '../../fixtures/export-1.coffee');
      await index.indexFile(file);
      const origianlSize = await countPromise(index.db, { "symbolInformation.location.uri": /fixtures\/export-1\.coffee/ });
      expect(origianlSize).not.toBe(0);
      await index.indexFile(file)
      const newSize = await countPromise(index.db, { "symbolInformation.location.uri": /fixtures\/export-1\.coffee/ });
      expect(newSize).toEqual(origianlSize)
    });
  });

  describe('#removeFile()', () => {
    test('does not duplicate if index same file twice', async () => {
      /** @type {SymbolIndex} */
      const index = this.index;
      const file1 = path.resolve(__dirname, '../../fixtures/export-1.coffee');
      const file2 = path.resolve(__dirname, '../../fixtures/export-2.coffee');

      await index.indexFile(file1);
      await index.indexFile(file2);

      const countFile1Original = await countPromise(index.db, { "symbolInformation.location.uri": /fixtures\/export-1\.coffee/ });
      expect(countFile1Original).not.toBe(0);

      const countFile2 = await countPromise(index.db, { "symbolInformation.location.uri": /fixtures\/export-2\.coffee/ });
      expect(countFile2).not.toBe(0);

      await index.removeFile(file1);

      const countFile1AfterRemoval = await countPromise(index.db, { "symbolInformation.location.uri": /fixtures\/export-1\.coffee/ });
      expect(countFile1AfterRemoval).toEqual(0);

      const countFile2AfterFile1Removal = await countPromise(index.db, { "symbolInformation.location.uri": /fixtures\/export-2\.coffee/ });
      expect(countFile2AfterFile1Removal).toEqual(countFile2);
    });
  });

  describe('#find()', () => {
    /**
     * @param {SymbolIndex} index
     */
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
