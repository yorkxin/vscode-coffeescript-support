import * as path from 'path';
import * as fs from 'fs';
import * as tmp from 'tmp';

import { IndexService } from '../../../src/lib/IndexService';

const TEST_FIXTURES_ROOT = path.resolve(__dirname, '../../../../test-fixtures');

describe('IndexService', () => {
  function initService () {
    const tempura = tmp.fileSync({ dir: path.resolve(__dirname, 'tmp') })
    fs.closeSync(tempura.fd);
    return new IndexService(tempura.name);
  }

  function shutdownService (indexService: IndexService) {
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
      const service: IndexService = this.indexService;

      const files = [
        path.resolve(TEST_FIXTURES_ROOT, 'globals.coffee'),
        path.resolve(TEST_FIXTURES_ROOT, 'sample.coffee')
      ];

      await service.indexFilesInBackground(files)
      await expect(service.find("bar")).resolves.toHaveLength(4)
    });
  });

  describe('#find()', () => {
    beforeEach(async () => {
      const service: IndexService = this.indexService;

      const files = [
        path.resolve(TEST_FIXTURES_ROOT, 'globals.coffee'),
        path.resolve(TEST_FIXTURES_ROOT, 'sample.coffee')
      ];

      await service.indexFilesInBackground(files)
    })

    test('calls symbolIndex#find', async () => {
      const service: IndexService = this.indexService
      service.symbolIndex.find = jest.fn()
      await service.find("bar")
      expect(service.symbolIndex.find).toHaveBeenCalledWith('bar')
    });

    test('does not even calls symbolIndex#find when no input string', async () => {
      const service: IndexService = this.indexService
      service.symbolIndex.find = jest.fn()
      await service.find("")
      expect(service.symbolIndex.find).not.toHaveBeenCalled()
    });
  });
})
