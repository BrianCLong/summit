export interface S3Blobs {
  get(key: string): Promise<Buffer>;
  put(key: string, data: Buffer): Promise<void>;
}

export class InMemoryBlobs implements S3Blobs {
  private store = new Map<string, Buffer>();
  async get(key: string): Promise<Buffer> {
    const v = this.store.get(key);
    if (!v) throw new Error('blob_not_found');
    return v;
  }
  async put(key: string, data: Buffer): Promise<void> {
    this.store.set(key, data);
  }
}


// S3-compatible implementation (beta)
export class S3BlobStore implements S3Blobs {
  private s3: any;
  private bucket: string;
  constructor(opts: { endpoint?: string; region?: string; accessKeyId?: string; secretAccessKey?: string; bucket: string }) {
    this.bucket = opts.bucket;
    // Lazy import to avoid bundler issues if not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: opts.region || 'us-east-1',
      endpoint: opts.endpoint,
      credentials: opts.accessKeyId && opts.secretAccessKey ? { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey } : undefined,
      forcePathStyle: true,
    });
    this.s3 = { client: s3, GetObjectCommand, PutObjectCommand };
  }
  async get(key: string): Promise<Buffer> {
    const cmd = new this.s3.GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res = await this.s3.client.send(cmd);
    const stream = res.Body;
    const chunks: any[] = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
  }
  async put(key: string, data: Buffer): Promise<void> {
    const cmd = new this.s3.PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data });
    await this.s3.client.send(cmd);
  }
}
