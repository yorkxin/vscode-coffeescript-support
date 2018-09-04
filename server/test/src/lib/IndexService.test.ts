import * as path from 'path';
import * as fs from 'fs';
import * as tmp from 'tmp';

import { IndexService } from '../../../src/lib/IndexService';

const TEST_FIXTURES_ROOT = path.resolve(__dirname, '../../fixtures');

describe('IndexService', () => {
  function initService() {
    const tempura = tmp.fileSync({ dir: path.resolve(__dirname, 'tmp') });
    fs.closeSync(tempura.fd);
    return new IndexService(tempura.name);
  }

  describe('#indexFilesInBackground()', () => {
    test('works', async () => {
      const files = [
        path.resolve(TEST_FIXTURES_ROOT, 'globals.coffee'),
        path.resolve(TEST_FIXTURES_ROOT, 'sample.coffee'),
      ];

      const service: IndexService = initService();

      const result = await (async () => {
        await service.indexFilesInBackground(files);
        return await service.find('bar');
      })();

      await service.shutdown();

      expect(result).toHaveLength(4);
    });
  });

  describe('#find()', () => {
    test('calls symbolIndex#find', async () => {
      const service: IndexService = initService();
      service.symbolIndex.find = jest.fn();
      await service.find('bar');
      expect(service.symbolIndex.find).toHaveBeenCalledWith('bar');
    });

    test('does not even calls symbolIndex#find when no input string', async () => {
      const service: IndexService = initService();
      service.symbolIndex.find = jest.fn();
      await service.find('');
      expect(service.symbolIndex.find).not.toHaveBeenCalled();
    });
  });
});
