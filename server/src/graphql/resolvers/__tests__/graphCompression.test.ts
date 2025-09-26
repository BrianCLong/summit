import { coreResolvers } from '../core.js';
import {
  GraphCompressionAlgorithm,
  compressGraphSnapshot,
  decompressGraphSnapshot,
  getGraphSnapshotS3Client,
} from '../../../graph/compression.js';

jest.mock('../../../graph/compression.js', () => {
  const actual = jest.requireActual('../../../graph/compression.js');
  return {
    ...actual,
    compressGraphSnapshot: jest.fn(),
    decompressGraphSnapshot: jest.fn(),
    getGraphSnapshotS3Client: jest.fn(),
  };
});

const mockedCompress = compressGraphSnapshot as jest.MockedFunction<typeof compressGraphSnapshot>;
const mockedDecompress = decompressGraphSnapshot as jest.MockedFunction<typeof decompressGraphSnapshot>;
const mockedClientFactory = getGraphSnapshotS3Client as jest.MockedFunction<typeof getGraphSnapshotS3Client>;

describe('coreResolvers graph compression mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes compression service with normalized metadata', async () => {
    const fakeClient = { id: 's3-client' } as any;
    mockedClientFactory.mockReturnValue(fakeClient);
    mockedCompress.mockResolvedValue({
      bucket: 'graphs',
      sourceKey: 'snapshot.json',
      targetKey: 'snapshot.json.gz',
      algorithm: GraphCompressionAlgorithm.GZIP,
      mode: 'COMPRESS',
      bytesIn: 100,
      bytesOut: 50,
      compressionRatio: 2,
      durationMs: 123,
      etag: 'etag',
      metadata: { foo: 'bar' },
    });

    const input = {
      bucket: 'graphs',
      sourceKey: 'snapshot.json',
      algorithm: GraphCompressionAlgorithm.GZIP,
      metadata: { foo: 'bar', nested: { a: 1 } },
      deleteSourceAfter: true,
    };

    const result = await coreResolvers.Mutation.compressGraphSnapshot({}, { input }, {});

    expect(mockedClientFactory).toHaveBeenCalled();
    expect(mockedCompress).toHaveBeenCalledWith(fakeClient, {
      bucket: 'graphs',
      sourceKey: 'snapshot.json',
      targetKey: undefined,
      algorithm: GraphCompressionAlgorithm.GZIP,
      level: undefined,
      metadata: { foo: 'bar', nested: JSON.stringify({ a: 1 }) },
      deleteSourceAfter: true,
    });
    expect(result).toEqual(
      expect.objectContaining({
        bucket: 'graphs',
        targetKey: 'snapshot.json.gz',
        mode: 'COMPRESS',
      }),
    );
  });

  it('invokes decompression service with defaults', async () => {
    const fakeClient = { id: 's3-client' } as any;
    mockedClientFactory.mockReturnValue(fakeClient);
    mockedDecompress.mockResolvedValue({
      bucket: 'graphs',
      sourceKey: 'snapshot.json.gz',
      targetKey: 'snapshot.json',
      algorithm: GraphCompressionAlgorithm.GZIP,
      mode: 'DECOMPRESS',
      bytesIn: 50,
      bytesOut: 100,
      compressionRatio: 2,
      durationMs: 80,
    });

    const input = {
      bucket: 'graphs',
      sourceKey: 'snapshot.json.gz',
      targetKey: 'snapshot-restored.json',
      algorithm: GraphCompressionAlgorithm.GZIP,
    };

    const result = await coreResolvers.Mutation.decompressGraphSnapshot({}, { input }, {});

    expect(mockedClientFactory).toHaveBeenCalled();
    expect(mockedDecompress).toHaveBeenCalledWith(fakeClient, {
      bucket: 'graphs',
      sourceKey: 'snapshot.json.gz',
      targetKey: 'snapshot-restored.json',
      algorithm: GraphCompressionAlgorithm.GZIP,
      metadata: undefined,
      deleteSourceAfter: undefined,
    });
    expect(result.mode).toBe('DECOMPRESS');
  });
});

