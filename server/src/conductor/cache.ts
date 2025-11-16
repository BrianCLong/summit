// import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import Redis from 'ioredis';
import { recHit, recMiss, recSet } from '../metrics/cacheMetrics.js';

type CacheOptions = {
  bucket?: string;
  indexPrefix?: string;
  indexTtlSec?: number;
  negTtlSec?: number;
};

function redisFromEnv() {
  if (process.env.REDIS_URL)
    return new Redis(process.env.REDIS_URL, {
      name: process.env.REDIS_CLIENT_NAME || 'maestro-cache',
    });
  const host = process.env.REDIS_HOST || 'redis';
  const port = Number(process.env.REDIS_PORT || 6379);
  const db = Number(process.env.REDIS_DB || 2);
  const tls =
    process.env.REDIS_TLS === 'true'
      ? { rejectUnauthorized: false }
      : (undefined as any);
  const password = process.env.REDIS_PASSWORD || undefined;
  return new Redis({
    host,
    port,
    db,
    password,
    tls,
    name: process.env.REDIS_CLIENT_NAME || 'maestro-cache',
  });
}

const redis = redisFromEnv();

// function s3FromEnv() {
//   const region = process.env.AWS_REGION || 'us-east-1';
//   const endpoint = process.env.S3_ENDPOINT || undefined;
//   const forcePathStyle = !!endpoint;
//   const creds = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
//     ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
//     : undefined;
//   return new S3Client({ region, endpoint, forcePathStyle, credentials: creds as any });
// }

// const s3 = s3FromEnv();

export class ConductorCache {
  private bucket: string;
  private indexPrefix: string;
  private indexTtl: number;
  private negTtl: number;

  constructor(opts: CacheOptions = {}) {
    this.bucket =
      opts.bucket ||
      process.env.CACHE_BUCKET ||
      process.env.S3_BUCKET ||
      'intelgraph-cache';
    this.indexPrefix = (opts.indexPrefix ||
      process.env.CACHE_INDEX_PREFIX ||
      'cache:index:') as string;
    this.indexTtl = Number(
      opts.indexTtlSec || process.env.CACHE_INDEX_TTL_SEC || 86400,
    );
    this.negTtl = Number(
      opts.negTtlSec || process.env.CACHE_NEG_TTL_SEC || 300,
    );
  }

  private indexKey(key: string) {
    return `${this.indexPrefix}${key}`;
  }

  async lookup(
    key: string,
    tenant?: string,
  ): Promise<{ meta: any; body: Buffer } | null> {
    const idxKey = this.indexKey(key);
    const head = await redis.get(idxKey);
    if (head === '__MISS__') return null;
    let meta: any | null = null;
    let s3key: string | null = null;
    if (head) {
      try {
        const j = JSON.parse(head);
        meta = j.meta;
        s3key = j.s3key;
      } catch {
        /* ignore */
      }
    }
    if (!s3key) return null;
    // try {
    //   await s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: s3key }));
    //   const obj = await s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: s3key }));
    //   const body = await streamToBuffer(obj.Body as any);
    //   recHit('redis+s3', 'get', tenant);
    //   return { meta, body };
    // } catch {
    //   await redis.set(idxKey, '__MISS__', 'EX', this.negTtl);
    //   recMiss('redis+s3', 'get', tenant);
    //   return null;
    // }
  }

  async write(
    key: string,
    body: Buffer,
    meta: any,
    ttlSec?: number,
    tenant?: string,
  ) {
    const s3key = `cache/${key}.bin`;
    // await s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: s3key, Body: body }));
    await redis.set(
      this.indexKey(key),
      JSON.stringify({ s3key, meta }),
      'EX',
      ttlSec ? Number(ttlSec) : this.indexTtl,
    );
    recSet('redis+s3', 'set', tenant);
  }
}

function streamToBuffer(stream: NodeJS.ReadableStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: any) =>
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)),
    );
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
