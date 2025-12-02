import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { CdnUploadService } from '../CdnUploadService.js';

const sendMock = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn(() => ({ send: sendMock })),
    PutObjectCommand: jest.fn((args) => args),
  };
});

describe('CdnUploadService', () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it('uploads assets and returns CDN URLs', async () => {
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
