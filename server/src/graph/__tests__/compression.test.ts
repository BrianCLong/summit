import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import {
  compressGraphSnapshot,
  decompressGraphSnapshot,
  GraphCompressionAlgorithm,
} from '../compression.js';

jest.mock('@aws-sdk/lib-storage', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  const { PutObjectCommand } = actual;

  const streamToBuffer = async (body: any): Promise<Buffer> => {
    if (!body) {
      return Buffer.alloc(0);
    }
    if (Buffer.isBuffer(body)) {
      return body;
    }
    if (typeof body === 'string') {
      return Buffer.from(body);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  };

  return {
    Upload: class {
      private readonly client: S3Client;
      private readonly params: any;

      constructor(options: { client: S3Client; params: any }) {
        this.client = options.client;
        this.params = options.params;
      }

      async done() {
        const { Body, ...rest } = this.params;
        const payload = await streamToBuffer(Body);
        return await this.client.send(new PutObjectCommand({ ...rest, Body: payload }));
      }
    },
  };
});

interface MemoryObject {
  body: Buffer;
  metadata: Record<string, string>;
  contentType?: string;
  contentEncoding?: string;
}

class MemoryS3Client {
  private readonly store = new Map<string, MemoryObject>();

  setObject(
    bucket: string,
    key: string,
    body: Buffer,
    options: { metadata?: Record<string, string>; contentType?: string; contentEncoding?: string } = {},
  ) {
    const id = this.makeKey(bucket, key);
    this.store.set(id, {
      body,
      metadata: { ...(options.metadata || {}) },
      contentType: options.contentType,
      contentEncoding: options.contentEncoding,
    });
  }

  getObject(bucket: string, key: string): MemoryObject | undefined {
    return this.store.get(this.makeKey(bucket, key));
  }

  async send(command: any) {
    if (command instanceof GetObjectCommand) {
      const bucket = command.input.Bucket as string;
      const key = command.input.Key as string;
      const record = this.getObject(bucket, key);
      if (!record) {
        throw new Error(`Object not found: ${bucket}/${key}`);
      }
      return {
        Body: Readable.from([record.body]),
        ContentLength: record.body.length,
        ContentType: record.contentType,
        ContentEncoding: record.contentEncoding,
        Metadata: { ...record.metadata },
      };
    }

    if (command instanceof PutObjectCommand) {
      const bucket = command.input.Bucket as string;
      const key = command.input.Key as string;
      const body = command.input.Body as Buffer | Uint8Array | string;
      let payload: Buffer;
      if (Buffer.isBuffer(body)) {
        payload = body;
      } else if (body instanceof Uint8Array) {
        payload = Buffer.from(body);
      } else if (typeof body === 'string') {
        payload = Buffer.from(body);
      } else {
        payload = Buffer.alloc(0);
      }
      this.setObject(bucket, key, payload, {
        metadata: (command.input.Metadata as Record<string, string>) || {},
        contentType: command.input.ContentType,
        contentEncoding: command.input.ContentEncoding,
      });
      return { ETag: `"${randomUUID()}"` };
    }

    if (command instanceof DeleteObjectCommand) {
      const bucket = command.input.Bucket as string;
      const key = command.input.Key as string;
      this.store.delete(this.makeKey(bucket, key));
      return {};
    }

    throw new Error(`Unsupported command ${command.constructor.name}`);
  }

  private makeKey(bucket: string, key: string) {
    return `${bucket}/${key}`;
  }
}

const TEST_BUCKET = 'graphs';

describe('graph compression utilities', () => {
  let client: MemoryS3Client;
  const sampleData = Buffer.from(JSON.stringify({ nodes: Array.from({ length: 1000 }, (_, i) => ({ id: i, label: 'Node' + i })) }));

  beforeEach(() => {
    client = new MemoryS3Client();
  });

  it('compresses a snapshot with gzip and stores metadata', async () => {
    client.setObject(TEST_BUCKET, 'snapshot.json', sampleData, { contentType: 'application/json' });

    const result = await compressGraphSnapshot(client as unknown as S3Client, {
      bucket: TEST_BUCKET,
      sourceKey: 'snapshot.json',
      algorithm: GraphCompressionAlgorithm.GZIP,
    });

    expect(result.mode).toBe('COMPRESS');
    expect(result.algorithm).toBe(GraphCompressionAlgorithm.GZIP);
    expect(result.targetKey).toBe('snapshot.json.gz');
    expect(result.bytesIn).toBe(sampleData.length);
    expect(result.bytesOut).toBeGreaterThan(0);
    expect(result.bytesOut).toBeLessThan(result.bytesIn);
    expect(result.compressionRatio).toBeGreaterThan(1);

    const stored = client.getObject(TEST_BUCKET, 'snapshot.json.gz');
    expect(stored).toBeDefined();
    expect(stored?.contentEncoding).toBe('gzip');
    expect(stored?.metadata['graph-original-key']).toBe('snapshot.json');
    expect(stored?.metadata['graph-compression-mode']).toBe('compress');
  });

  it('decompresses a snapshot and restores original payload', async () => {
    client.setObject(TEST_BUCKET, 'graph.json', sampleData, { contentType: 'application/json' });

    const compressed = await compressGraphSnapshot(client as unknown as S3Client, {
      bucket: TEST_BUCKET,
      sourceKey: 'graph.json',
      targetKey: 'graph.json.gz',
      algorithm: GraphCompressionAlgorithm.GZIP,
      deleteSourceAfter: true,
    });

    expect(client.getObject(TEST_BUCKET, 'graph.json')).toBeUndefined();

    const restored = await decompressGraphSnapshot(client as unknown as S3Client, {
      bucket: TEST_BUCKET,
      sourceKey: compressed.targetKey,
      targetKey: 'graph-restored.json',
      algorithm: GraphCompressionAlgorithm.GZIP,
    });

    expect(restored.mode).toBe('DECOMPRESS');
    expect(restored.bytesOut).toBe(sampleData.length);
    expect(restored.compressionRatio).toBeGreaterThan(1);

    const restoredObject = client.getObject(TEST_BUCKET, 'graph-restored.json');
    expect(restoredObject?.body.equals(sampleData)).toBe(true);
    expect(restoredObject?.contentEncoding).toBeUndefined();
    expect(restoredObject?.contentType).toBe('application/json');
  });

  it('supports zstd compression for large snapshots', async () => {
    client.setObject(TEST_BUCKET, 'zgraph.json', sampleData, { contentType: 'application/json' });

    const compressed = await compressGraphSnapshot(client as unknown as S3Client, {
      bucket: TEST_BUCKET,
      sourceKey: 'zgraph.json',
      algorithm: GraphCompressionAlgorithm.ZSTD,
    });

    expect(compressed.targetKey).toBe('zgraph.json.zst');
    expect(compressed.compressionRatio).toBeGreaterThan(1);

    const decompressed = await decompressGraphSnapshot(client as unknown as S3Client, {
      bucket: TEST_BUCKET,
      sourceKey: compressed.targetKey,
      algorithm: GraphCompressionAlgorithm.ZSTD,
    });

    expect(decompressed.bytesOut).toBe(sampleData.length);
    const restored = client.getObject(TEST_BUCKET, 'zgraph.json');
    expect(restored?.body.equals(sampleData)).toBe(true);
  });
});

