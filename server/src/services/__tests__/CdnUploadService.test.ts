import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const mockSend = jest.fn();

describe('CdnUploadService', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({});
  });

  it('uploads assets and returns CDN URLs', async () => {
    const { CdnUploadService } = await import('../CdnUploadService.js');
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cdn-upload-'));
    const filePath = path.join(tmpDir, 'file.jpg');
    await fs.writeFile(filePath, 'content');

    const service = new CdnUploadService({
      enabled: true,
      bucket: 'test-bucket',
      region: 'us-east-1',
      publicUrl: 'https://cdn.example.com',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    });
    (service as any).client.send = mockSend;

    const result = await service.uploadFiles([
      { localPath: filePath, key: 'file.jpg', contentType: 'image/jpeg' },
    ]);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(result['file.jpg']).toBe('https://cdn.example.com/file.jpg');
  });
});
