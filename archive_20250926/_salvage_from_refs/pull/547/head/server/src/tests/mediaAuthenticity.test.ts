import { promises as fs } from 'fs';
import path from 'path';
import { MediaPrecheckService } from '../services/MediaPrecheckService.js';

describe('MediaPrecheckService', () => {
  const service = new MediaPrecheckService();
  const tempFile = path.join(__dirname, 'tmp.bin');

  beforeAll(async () => {
    await fs.writeFile(tempFile, Buffer.from('test'));
  });

  afterAll(async () => {
    await fs.unlink(tempFile).catch(() => undefined);
  });

  it('allows whitelisted mime types', async () => {
    const res = await service.runPrecheck(tempFile, 'image/png');
    expect(res.allowed).toBe(true);
    expect(res.features?.pHash).toBe('phash:stub');
  });

  it('rejects disallowed mime types', async () => {
    const res = await service.runPrecheck(tempFile, 'image/gif');
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('mime_not_allowed');
  });
});
