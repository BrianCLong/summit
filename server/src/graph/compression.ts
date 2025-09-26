import { createRequire } from 'node:module';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { PassThrough, Transform } from 'node:stream';
import { pipeline as pipelinePromise } from 'node:stream/promises';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createGzip, createGunzip } from 'node:zlib';

const require = createRequire(import.meta.url);

export enum GraphCompressionAlgorithm {
  GZIP = 'GZIP',
  ZSTD = 'ZSTD',
}

export enum GraphCompressionMode {
  COMPRESS = 'COMPRESS',
  DECOMPRESS = 'DECOMPRESS',
}

export interface GraphCompressionParams {
  bucket: string;
  sourceKey: string;
  targetKey?: string;
  algorithm: GraphCompressionAlgorithm;
  level?: number;
  metadata?: Record<string, string>;
  deleteSourceAfter?: boolean;
}

export interface GraphCompressionResult {
  bucket: string;
  sourceKey: string;
  targetKey: string;
  algorithm: GraphCompressionAlgorithm;
  mode: GraphCompressionMode;
  bytesIn: number;
  bytesOut: number;
  compressionRatio: number | null;
  durationMs: number;
  etag?: string;
  metadata?: Record<string, string>;
}

class ByteCounter extends Transform {
  public bytes = 0;

  constructor() {
    super();
  }

  override _transform(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void) {
    if (chunk) {
      this.bytes += chunk.length || 0;
    }
    callback(null, chunk);
  }
}

let cachedClient: S3Client | null = null;

export function getGraphSnapshotS3Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  cachedClient = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials:
      accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
          }
        : undefined,
  });

  return cachedClient;
}

export async function compressGraphSnapshot(
  client: S3Client,
  params: GraphCompressionParams,
): Promise<GraphCompressionResult> {
  return processGraphSnapshot(client, params, GraphCompressionMode.COMPRESS);
}

export async function decompressGraphSnapshot(
  client: S3Client,
  params: GraphCompressionParams,
): Promise<GraphCompressionResult> {
  return processGraphSnapshot(client, params, GraphCompressionMode.DECOMPRESS);
}

async function processGraphSnapshot(
  client: S3Client,
  params: GraphCompressionParams,
  mode: GraphCompressionMode,
): Promise<GraphCompressionResult> {
  const start = Date.now();
  const algorithm = params.algorithm;

  const targetKey = params.targetKey || deriveTargetKey(params.sourceKey, algorithm, mode);
  const getResponse = await client.send(
    new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.sourceKey,
    }),
  );

  const bodyStream = getResponse.Body as NodeJS.ReadableStream | undefined;
  if (!bodyStream) {
    throw new Error(`S3 object ${params.bucket}/${params.sourceKey} does not contain a readable body`);
  }

  const uploadStream = new PassThrough();
  const inputCounter = new ByteCounter();
  const outputCounter = new ByteCounter();

  const metadata = buildMetadata(params, getResponse, mode);
  const contentType = resolveContentType(getResponse, metadata, mode);
  const contentEncoding = mode === GraphCompressionMode.COMPRESS ? resolveEncoding(algorithm) : undefined;

  const upload = new Upload({
    client,
    params: {
      Bucket: params.bucket,
      Key: targetKey,
      Body: uploadStream,
      ContentType: contentType,
      ...(contentEncoding ? { ContentEncoding: contentEncoding } : {}),
      ...(metadata ? { Metadata: metadata } : {}),
    },
  });

  const uploadPromise = upload.done();

  try {
    if (algorithm === GraphCompressionAlgorithm.GZIP) {
      await handleGzip(bodyStream, inputCounter, outputCounter, uploadStream, mode, params.level);
    } else {
      await handleZstd(bodyStream, inputCounter, outputCounter, uploadStream, mode, params.level);
    }
  } catch (error) {
    uploadStream.destroy(error as Error);
    throw error;
  }

  const uploadResult = await uploadPromise;

  if (params.deleteSourceAfter) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: params.bucket,
        Key: params.sourceKey,
      }),
    );
  }

  const durationMs = Date.now() - start;
  const compressionRatio = calculateRatio(inputCounter.bytes, outputCounter.bytes, mode);

  return {
    bucket: params.bucket,
    sourceKey: params.sourceKey,
    targetKey,
    algorithm,
    mode,
    bytesIn: inputCounter.bytes,
    bytesOut: outputCounter.bytes,
    compressionRatio,
    durationMs,
    etag: uploadResult?.ETag,
    metadata: metadata || undefined,
  };
}

async function handleGzip(
  source: NodeJS.ReadableStream,
  inputCounter: ByteCounter,
  outputCounter: ByteCounter,
  destination: PassThrough,
  mode: GraphCompressionMode,
  level?: number,
) {
  const normalizedLevel = normalizeGzipLevel(level);
  if (mode === GraphCompressionMode.COMPRESS) {
    const gzip = createGzip({ level: normalizedLevel });
    await pipelinePromise(source, inputCounter, gzip, outputCounter, destination);
  } else {
    const gunzip = createGunzip();
    await pipelinePromise(source, inputCounter, gunzip, outputCounter, destination);
  }
}

async function handleZstd(
  source: NodeJS.ReadableStream,
  inputCounter: ByteCounter,
  outputCounter: ByteCounter,
  destination: PassThrough,
  mode: GraphCompressionMode,
  level?: number,
) {
  const proc = spawnZstd(mode, level);
  const stderrChunks: string[] = [];
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk) => {
    if (typeof chunk === 'string') {
      stderrChunks.push(chunk);
    }
  });

  const pumping = Promise.all([
    pipelinePromise(source, inputCounter, proc.stdin),
    pipelinePromise(proc.stdout, outputCounter, destination),
  ]);

  const [result] = await Promise.all([waitForProcess(proc), pumping]);
  if (result.code !== 0) {
    const stderr = stderrChunks.join('').trim();
    const suffix = stderr ? `: ${stderr}` : '';
    throw new Error(`zstd process exited with code ${result.code}${result.signal ? ` signal ${result.signal}` : ''}${suffix}`);
  }
}

function spawnZstd(mode: GraphCompressionMode, level?: number): ChildProcessWithoutNullStreams {
  const binaryPath = resolveZstdBinary();
  const args: string[] = [];

  if (mode === GraphCompressionMode.COMPRESS) {
    args.push('-f', '-T0', '-c');
    if (typeof level === 'number' && Number.isInteger(level)) {
      args.push(`-${Math.max(1, Math.min(level, 19))}`);
    }
  } else {
    args.push('-d', '-f', '-c');
  }

  args.push('-');

  return spawn(binaryPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
}

function resolveZstdBinary(): string {
  const platform = process.platform;
  const arch = process.arch;
  let binaryName: string;

  if (platform === 'win32') {
    binaryName = arch === 'x64' ? 'zstd64.exe' : 'zstd32.exe';
  } else if (platform === 'darwin') {
    binaryName = 'zstd.darwin';
  } else {
    binaryName = 'zstd.linux64';
  }

  const resolved = require.resolve(`node-zstandard/bin/${binaryName}`);
  return resolved;
}

function waitForProcess(proc: ChildProcessWithoutNullStreams): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onClose = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      resolve({ code, signal });
    };
    const cleanup = () => {
      proc.removeListener('error', onError);
      proc.removeListener('close', onClose);
    };

    proc.once('error', onError);
    proc.once('close', onClose);
  });
}

function deriveTargetKey(sourceKey: string, algorithm: GraphCompressionAlgorithm, mode: GraphCompressionMode): string {
  if (mode === GraphCompressionMode.COMPRESS) {
    if (algorithm === GraphCompressionAlgorithm.GZIP) {
      return sourceKey.endsWith('.gz') ? sourceKey : `${sourceKey}.gz`;
    }
    if (sourceKey.endsWith('.zst') || sourceKey.endsWith('.zstd')) {
      return sourceKey;
    }
    return `${sourceKey}.zst`;
  }

  if (algorithm === GraphCompressionAlgorithm.GZIP) {
    return sourceKey.endsWith('.gz') ? sourceKey.slice(0, -3) : `${sourceKey}.decompressed`;
  }

  if (sourceKey.endsWith('.zst')) {
    return sourceKey.slice(0, -4);
  }
  if (sourceKey.endsWith('.zstd')) {
    return sourceKey.slice(0, -5);
  }
  return `${sourceKey}.decompressed`;
}

function normalizeGzipLevel(level?: number): number {
  if (typeof level !== 'number') {
    return 6;
  }
  if (!Number.isFinite(level)) {
    return 6;
  }
  return Math.max(1, Math.min(Math.round(level), 9));
}

function calculateRatio(inputBytes: number, outputBytes: number, mode: GraphCompressionMode): number | null {
  if (!inputBytes || !outputBytes) {
    return null;
  }
  if (mode === GraphCompressionMode.COMPRESS) {
    return inputBytes / outputBytes;
  }
  return outputBytes / inputBytes;
}

function resolveEncoding(algorithm: GraphCompressionAlgorithm): string {
  return algorithm === GraphCompressionAlgorithm.GZIP ? 'gzip' : 'zstd';
}

function buildMetadata(
  params: GraphCompressionParams,
  response: GetObjectCommandOutput,
  mode: GraphCompressionMode,
): Record<string, string> | null {
  const base: Record<string, string> = {};

  if (mode === GraphCompressionMode.COMPRESS) {
    base['graph-original-key'] = params.sourceKey;
    if (response.ContentType) {
      base['graph-original-content-type'] = response.ContentType;
    }
  } else if (response.Metadata) {
    if (response.Metadata['graph-original-key']) {
      base['graph-original-key'] = response.Metadata['graph-original-key'];
    }
    if (response.Metadata['graph-original-content-type']) {
      base['graph-original-content-type'] = response.Metadata['graph-original-content-type'];
    }
  }

  base['graph-compression-mode'] = mode.toLowerCase();
  base['graph-compression-algorithm'] = params.algorithm.toLowerCase();

  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      base[key.toLowerCase()] = String(value);
    }
  }

  return Object.keys(base).length ? base : null;
}

function resolveContentType(
  response: GetObjectCommandOutput,
  metadata: Record<string, string> | null,
  mode: GraphCompressionMode,
): string {
  if (mode === GraphCompressionMode.COMPRESS) {
    return 'application/octet-stream';
  }
  const originalContentType = metadata?.['graph-original-content-type'] || response.ContentType;
  return originalContentType || 'application/octet-stream';
}

