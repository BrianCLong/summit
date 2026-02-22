
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Define mocks
const mockFsPromises = {
  mkdir: jest.fn(),
  stat: jest.fn(),
  rename: jest.fn(),
  unlink: jest.fn(),
};

const mockCreateWriteStream = jest.fn((filePath: any) => {
    const stream: any = {
        write: jest.fn((chunk: any, encoding: any, callback: any) => callback && callback()),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
        destroy: jest.fn(),
    };
    return stream;
});

jest.unstable_mockModule('fs', () => {
  const mockFs = {
    promises: mockFsPromises,
    mkdir: mockFsPromises.mkdir,
    stat: mockFsPromises.stat,
    rename: mockFsPromises.rename,
    unlink: mockFsPromises.unlink,
    createWriteStream: mockCreateWriteStream,
    createReadStream: jest.fn(() => {
        return {
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('fake-content');
            },
            on: jest.fn(),
            pipe: jest.fn(),
            destroy: jest.fn(),
        } as any;
    }),
  };

  return {
    default: mockFs,
    ...mockFs,
    promises: mockFsPromises,
  };
});

jest.unstable_mockModule('stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('sharp', () => ({
  default: () => ({
    metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue({}),
  })
}));

jest.unstable_mockModule('../CdnUploadService.js', () => ({
  CdnUploadService: jest.fn(),
}));

// Mock ImageProcessingPipeline to avoid sharp issues entirely
jest.unstable_mockModule('../ImageProcessingPipeline.js', () => ({
  ImageProcessingPipeline: class MockPipeline {
    processImage = jest.fn().mockResolvedValue({
      optimizedInfo: { width: 100, height: 100, channels: 3 },
      thumbnails: [],
      conversions: [],
    });
  },
  defaultImageProcessingConfig: {},
}));

// Dynamic import after mocks
const { MediaUploadService, defaultMediaUploadConfig } = await import('../MediaUploadService.js');

describe('MediaUploadService Security', () => {
  let service: MediaUploadService;
  const config = { ...defaultMediaUploadConfig, uploadPath: '/tmp/uploads' };

  beforeEach(() => {
    jest.clearAllMocks();

    // Explicitly set return values here
    (mockFsPromises.stat as jest.Mock).mockResolvedValue({ size: 1000 });
    (mockFsPromises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (mockFsPromises.rename as jest.Mock).mockResolvedValue(undefined);
    (mockFsPromises.unlink as jest.Mock).mockResolvedValue(undefined);

    service = new MediaUploadService(config);
  });

  it('SECURITY: should ignore dangerous extensions when mimetype is safe (e.g. image/jpeg -> .jpg)', async () => {
    const upload = Promise.resolve({
      createReadStream: () => {
        return {
          [Symbol.asyncIterator]: async function* () { yield 'fake'; },
          pipe: jest.fn(),
          on: jest.fn(),
        };
      },
      filename: 'exploit.html',
      mimetype: 'image/jpeg',
      encoding: '7bit',
    });

    try {
        await service.uploadMedia(upload as any);
    } catch (e) {
        // Ignore expected error downstream (e.g. at createReadStream or rename)
    }

    expect(mockCreateWriteStream).toHaveBeenCalled();
    const filePath = mockCreateWriteStream.mock.calls[0][0] as string;
    console.log('DEBUG: filePath', filePath);
    // Should end with .jpg, NOT .html
    expect(filePath.endsWith('.jpg')).toBe(true);
    expect(filePath.endsWith('.html')).toBe(false);
  });

  it('REGRESSION: should handle normal uploads correctly (e.g. image/jpeg -> .jpg)', async () => {
    const upload = Promise.resolve({
      createReadStream: () => {
        return {
          [Symbol.asyncIterator]: async function* () { yield 'fake'; },
          pipe: jest.fn(),
          on: jest.fn(),
        };
      },
      filename: 'test.jpg',
      mimetype: 'image/jpeg',
      encoding: '7bit',
    });

    try {
        await service.uploadMedia(upload as any);
    } catch (e) {}

    expect(mockCreateWriteStream).toHaveBeenCalled();
    const filePath = mockCreateWriteStream.mock.calls[0][0] as string;
    expect(filePath.endsWith('.jpg')).toBe(true);
  });

  it('SECURITY: should sanitize text/html to .txt', async () => {
    const upload = Promise.resolve({
      createReadStream: () => {
        return {
          [Symbol.asyncIterator]: async function* () { yield 'fake'; },
          pipe: jest.fn(),
          on: jest.fn(),
        };
      },
      filename: 'page.html',
      mimetype: 'text/html',
      encoding: '7bit',
    });

    try {
        await service.uploadMedia(upload as any);
    } catch (e) {}

    expect(mockCreateWriteStream).toHaveBeenCalled();
    const filePath = mockCreateWriteStream.mock.calls[0][0] as string;
    expect(filePath.endsWith('.txt')).toBe(true);
    expect(filePath.endsWith('.html')).toBe(false);
  });
});
