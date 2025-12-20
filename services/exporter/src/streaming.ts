import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform, Writable } from 'stream';
import { createHash } from 'crypto';
import { dirname, join } from 'path';
import JSZip from 'jszip';
import stringify from 'json-stable-stringify';
import {
  ExportFile,
  ExportManifest,
  ExportManifestEntry,
  ExportRequest,
  uuidV5ForPath,
} from './exporter';
import { applyRedactions } from './redact';
import { createPdf } from './pdf';
import { sha256, sortObject } from './utils';

export type ProgressStage = 'export' | 'import';

export interface ProgressUpdate {
  stage: ProgressStage;
  bytesProcessed: number;
  totalBytes?: number;
  percent?: number;
}

interface CheckpointState {
  bytesProcessed: number;
  chunkHashes: string[];
  completed?: boolean;
  hash?: string;
}

const fixedDate = new Date('2000-01-01T00:00:00Z');

async function ensureDir(filePath: string) {
  await fs.mkdir(dirname(filePath), { recursive: true });
}

async function writeCheckpoint(path: string, state: CheckpointState) {
  await ensureDir(path);
  await fs.writeFile(path, JSON.stringify(state, null, 2), 'utf-8');
}

async function readCheckpoint(path: string): Promise<CheckpointState | null> {
  try {
    const raw = await fs.readFile(path, 'utf-8');
    return JSON.parse(raw) as CheckpointState;
  } catch {
    return null;
  }
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), async function* (source) {
    for await (const chunk of source) {
      hash.update(chunk);
      yield chunk;
    }
  });
  return hash.digest('hex');
}

export interface StreamOptions {
  outputPath: string;
  checkpointPath: string;
  chunkSize?: number;
  totalBytes?: number;
  stage: ProgressStage;
  signal?: AbortSignal;
  onProgress?: (update: ProgressUpdate) => void;
}

async function streamWithCheckpoint(
  source: NodeJS.ReadableStream,
  options: StreamOptions,
): Promise<{ hash: string; chunkHashes: string[]; bytesProcessed: number }> {
  const {
    outputPath,
    checkpointPath,
    totalBytes,
    stage,
    signal,
  } = options;
  const chunkHashes: string[] = [];
  const checkpoint = await readCheckpoint(checkpointPath);
  const existingSize = await fs
    .stat(outputPath)
    .then((stat) => stat.size)
    .catch(() => 0);
  const resumeOffset = Math.min(checkpoint?.bytesProcessed ?? 0, existingSize);
  const hash = createHash('sha256');
  let processed = 0;
  const chunkSize = options.chunkSize ?? 1024 * 1024;
  let buffer = Buffer.alloc(0);

  await ensureDir(outputPath);
  await fs.writeFile(outputPath, '', { flag: 'a' });
  await fs.truncate(outputPath, resumeOffset);

  const writer = createWriteStream(outputPath, {
    flags: 'a',
    start: resumeOffset,
  });

  const processSlice = async (slice: Buffer) => {
    const chunkHash = createHash('sha256').update(slice).digest('hex');
    chunkHashes.push(chunkHash);
    const previousProcessed = processed;
    processed += slice.length;
    hash.update(slice);

    let writable: Buffer | null = slice;
    if (processed <= resumeOffset) {
      writable = null;
    } else if (previousProcessed < resumeOffset) {
      const alreadyWritten = resumeOffset - previousProcessed;
      writable = slice.slice(alreadyWritten);
    }

    await writeCheckpoint(checkpointPath, {
      bytesProcessed: processed,
      chunkHashes,
    });

    const progress: ProgressUpdate = {
      stage,
      bytesProcessed: processed,
      totalBytes,
      percent:
        totalBytes && totalBytes > 0
          ? Math.min(100, Number(((processed / totalBytes) * 100).toFixed(2)))
          : undefined,
    };
    if (options.onProgress) options.onProgress(progress);

    if (writable && writable.length > 0) {
      return writable;
    }
    return null;
  };

  const chunker = new Transform({
    transform(chunk, _enc, cb) {
      const run = async () => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= chunkSize) {
          const slice = buffer.subarray(0, chunkSize);
          buffer = buffer.subarray(chunkSize);
          const writable = await processSlice(slice);
          if (writable) this.push(writable);
        }
      };
      run().then(() => cb(), cb);
    },
    flush(cb) {
      const run = async () => {
        if (buffer.length > 0) {
          const writable = await processSlice(buffer);
          if (writable) this.push(writable);
        }
      };
      run().then(() => cb(), cb);
    },
  });

  await pipeline(source, chunker, writer, { signal });

  const digest = hash.digest('hex');
  await writeCheckpoint(checkpointPath, {
    bytesProcessed: processed,
    chunkHashes,
    completed: true,
    hash: digest,
  });

  return { hash: digest, chunkHashes, bytesProcessed: processed };
}

async function buildFiles(req: ExportRequest): Promise<{
  files: ExportFile[];
  manifest: ExportManifest;
}> {
  const files: ExportFile[] = [];
  const redactionLog: string[] = [];

  const entities = applyRedactions(req.entities, req.redactRules, redactionLog);
  const edges = applyRedactions(req.edges, req.redactRules, redactionLog);

  if (req.format.includes('json')) {
    const entStr = stringify(sortObject(entities)) as string;
    files.push({ path: 'data/entities.json', content: Buffer.from(entStr) });
    const edgeStr = stringify(sortObject(edges)) as string;
    files.push({ path: 'data/edges.json', content: Buffer.from(edgeStr) });
  }

  if (req.format.includes('csv')) {
    const toCsv = (data: Record<string, unknown>[]) => {
      if (data.length === 0) return '';
      const headers = Array.from(
        new Set(data.flatMap((d) => Object.keys(d))),
      ).sort();
      const escape = (val: unknown) => {
        const str = val == null ? '' : String(val);
        if (/[",\n]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const rows = data
        .map((row) =>
          headers.map((h) => escape((row as Record<string, unknown>)[h])),
        )
        .map((r) => r.join(','));
      return [headers.join(','), ...rows].join('\n');
    };

    files.push({
      path: 'data/entities.csv',
      content: Buffer.from(toCsv(entities)),
    });
    files.push({
      path: 'data/edges.csv',
      content: Buffer.from(toCsv(edges)),
    });
  }

  if (req.format.includes('pdf')) {
    // PDF creation is already streaming-safe inside createPdf
    files.push({
      path: 'figures/graph.pdf',
      content: await createPdf(entities.length, edges.length),
    });
  }

  if (redactionLog.length) {
    files.push({
      path: 'redaction.log',
      content: Buffer.from(redactionLog.join('\n')),
    });
  }

  const manifestEntries: ExportManifestEntry[] = files.map((f) => ({
    path: f.path,
    sha256: sha256(f.content),
    uuid: uuidV5ForPath(f.path),
  }));

  const manifest: ExportManifest = {
    generatedAt: fixedDate.toISOString(),
    chainOfCustody: [{ event: 'export', timestamp: fixedDate.toISOString() }],
    files: manifestEntries.sort((a, b) => a.path.localeCompare(b.path)),
  };

  files.push({
    path: 'manifest.json',
    content: Buffer.from(stringify(manifest) as string),
  });

  return { files: files.sort((a, b) => a.path.localeCompare(b.path)), manifest };
}

export interface StreamingExportOptions {
  outputPath: string;
  checkpointPath: string;
  chunkSize?: number;
  onProgress?: (update: ProgressUpdate) => void;
  signal?: AbortSignal;
}

export async function createStreamingExport(
  req: ExportRequest,
  options: StreamingExportOptions,
): Promise<{ outputPath: string; hash: string; manifest: ExportManifest }> {
  const { files, manifest } = await buildFiles(req);
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content, { date: fixedDate });
  }

  const zipStream = zip.generateNodeStream({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const totalBytes = files.reduce((sum, file) => sum + file.content.length, 0);

  const result = await streamWithCheckpoint(zipStream, {
    outputPath: options.outputPath,
    checkpointPath: options.checkpointPath,
    chunkSize: options.chunkSize,
    totalBytes,
    stage: 'export',
    signal: options.signal,
    onProgress: options.onProgress,
  });

  return {
    outputPath: options.outputPath,
    hash: result.hash,
    manifest,
  };
}

export async function verifyImportWithCheckpoint(
  filePath: string,
  checkpointPath: string,
  options?: {
    chunkSize?: number;
    signal?: AbortSignal;
    onProgress?: (update: ProgressUpdate) => void;
  },
): Promise<{ hash: string; chunkHashes: string[] }> {
  const totalBytes = (await fs.stat(filePath)).size;
  const chunkHashes: string[] = [];
  const hash = createHash('sha256');
  const checkpoint = await readCheckpoint(checkpointPath);
  if (checkpoint?.completed && checkpoint.hash) {
    return { hash: checkpoint.hash, chunkHashes: checkpoint.chunkHashes };
  }

  const sink = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  });

  let processed = 0;
  const chunkSize = options?.chunkSize ?? 1024 * 1024;
  let buffer = Buffer.alloc(0);

  const tracker = new Transform({
    transform(chunk, _enc, cb) {
      const run = async () => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= chunkSize) {
          const slice = buffer.subarray(0, chunkSize);
          buffer = buffer.subarray(chunkSize);
          processed += slice.length;
          const digest = createHash('sha256').update(slice).digest('hex');
          chunkHashes.push(digest);
          hash.update(slice);

          const progress: ProgressUpdate = {
            stage: 'import',
            bytesProcessed: processed,
            totalBytes,
            percent: Number(((processed / totalBytes) * 100).toFixed(2)),
          };
          if (options?.onProgress) options.onProgress(progress);

          await writeCheckpoint(checkpointPath, {
            bytesProcessed: processed,
            chunkHashes,
          });
        }
      };
      run().then(() => cb(null, null), cb);
    },
    flush(cb) {
      const run = async () => {
        if (buffer.length > 0) {
          processed += buffer.length;
          const digest = createHash('sha256').update(buffer).digest('hex');
          chunkHashes.push(digest);
          hash.update(buffer);
          await writeCheckpoint(checkpointPath, {
            bytesProcessed: processed,
            chunkHashes,
          });
        }
      };
      run().then(() => cb(), cb);
    },
  });

  const reader = createReadStream(filePath);
  await pipeline(reader, tracker, sink, { signal: options?.signal });

  const finalHash = hash.digest('hex');
  await writeCheckpoint(checkpointPath, {
    bytesProcessed: processed,
    chunkHashes,
    completed: true,
    hash: finalHash,
  });

  return { hash: finalHash, chunkHashes };
}

export async function computeHashForBuffer(
  buffer: Buffer,
): Promise<string> {
  const hash = createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

export async function compareExportOutputs(
  reference: Buffer,
  streamedFilePath: string,
): Promise<boolean> {
  const referenceHash = await computeHashForBuffer(reference);
  const streamedHash = await hashFile(streamedFilePath);
  return referenceHash === streamedHash;
}
