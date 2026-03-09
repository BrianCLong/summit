import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const sendMock = jest.fn().mockResolvedValue({});

describe('CdnUploadService', () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it('uploads assets and returns CDN URLs', async () => {
    jest.resetModules();
    await jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
      S3Client: jest.fn(() => ({ send: sendMock })),
      PutObjectCommand: jest.fn((args) => args),
    }));

    const { CdnUploadService } = await import('../CdnUploadService.js');
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cdn-upload-'));
    const filePath = path.join(tmpDir, 'file.jpg');
    await fs.writeFile(filePath, 'content');

    const service = new CdnUploadService({
      enabled: true,
      bucket: 'test-bucket',
      region: 'us-east-1',
      publicUrl: 'https://cdn.example.com',
    });

    const result = await service.uploadFiles([
      { localPath: filePath, key: 'file.jpg', contentType: 'image/jpeg' },
    ]);

    expect(sendMock).toHaveBeenCalled();
    expect(result['file.jpg']).toBe('https://cdn.example.com/file.jpg');
  });
});
