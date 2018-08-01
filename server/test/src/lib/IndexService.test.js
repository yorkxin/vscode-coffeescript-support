const path = require('path');
const fs = require('fs');
const tmp = require('tmp');

const { IndexService } = require('../../../src/lib/IndexService');

describe('IndexService', () => {
  function initService () {
    const tempura = tmp.fileSync({ dir: path.resolve(__dirname, 'tmp') })
    fs.closeSync(tempura.fd);
    return new IndexService(tempura.name);
  }

  /**
   *
   * @param {IndexService} indexService
   */
  function shutdownService (indexService) {
    indexService.shutdown()
  }

  beforeEach(() => {
    this.indexService = initService()
  });

  afterEach(() => {
    shutdownService(this.indexService);
  });

  describe('#indexFilesInBackground()', () => {
    test('works', async () => {
      /** @type {IndexService} */
      const service = this.indexService;

      const files = [
        path.resolve(__dirname, '../../fixtures/globals.coffee'),
        path.resolve(__dirname, '../../fixtures/sample.coffee')
      ];

      await service.indexFilesInBackground(files)
      await expect(service.find("bar")).resolves.toHaveLength(4)
    });
  });

  describe('#find()', () => {
    beforeEach(async () => {
      /** @type {IndexService} */
      const service = this.indexService;

      const files = [
        path.resolve(__dirname, '../../fixtures/globals.coffee'),
        path.resolve(__dirname, '../../fixtures/sample.coffee')
      ];

      await service.indexFilesInBackground(files)
    })

    test('calls symbolIndex#find', async () => {
      /** @type {IndexService} */
      const service = this.indexService
      service.symbolIndex.find = jest.fn()
      await service.find("bar")
      expect(service.symbolIndex.find).toHaveBeenCalledWith('bar')
    });

    test('does not even calls symbolIndex#find when no input string', async () => {
      /** @type {IndexService} */
      const service = this.indexService
      service.symbolIndex.find = jest.fn()
      await service.find("")
      expect(service.symbolIndex.find).not.toHaveBeenCalled()
    });
  });
})
