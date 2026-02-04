import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MAX_SCAN_BYTES = 2 * 1024 * 1024;
const SCHEMA_VERSION = '1.0.0';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
};

const CONTAINER_BY_EXTENSION: Record<string, string> = {
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.gif': 'gif',
  '.webp': 'webp',
  '.svg': 'svg',
  '.tif': 'tiff',
  '.tiff': 'tiff',
  '.mp4': 'mp4',
  '.mov': 'quicktime',
  '.webm': 'webm',
  '.mkv': 'matroska',
};

const CODEC_BY_EXTENSION: Record<string, string> = {
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.gif': 'gif',
  '.webp': 'webp',
  '.svg': 'svg',
  '.tif': 'tiff',
  '.tiff': 'tiff',
};

const C2PA_MARKERS = [
  'c2pa',
  'urn:c2pa',
  'contentcredentials',
  'content credentials',
  'jumbf',
  'c2pa.manifest',
];

export type C2paStatus = 'absent' | 'unverified';

export interface C2paDetection {
  present: boolean;
  status: C2paStatus;
  markers: string[];
}

export interface MediaMetadata {
  sha256: string;
  sizeBytes: number;
  mime: string;
  extension: string;
  container: string | null;
  containerDetail: string | null;
  codec: string | null;
}

export interface MediaReport {
  schemaVersion: string;
  input: {
    path: string;
    filename: string;
  };
  media: MediaMetadata;
  provenance: {
    c2pa: C2paDetection;
  };
  warnings: string[];
}

export interface MetricsReport {
  schemaVersion: string;
  counts: {
    files: number;
    c2paPresent: number;
    c2paUnverified: number;
  };
}

export interface StampReport {
  schemaVersion: string;
  generatedAt: string;
  input: {
    path: string;
    resolvedPath: string;
  };
  fileTimestamps: {
    mtimeMs: number;
    ctimeMs: number;
  };
  tool: {
    name: string;
    version: string;
  };
}

export interface MediaEvidenceResult {
  report: MediaReport;
  metrics: MetricsReport;
  stamp: StampReport;
}

export interface BuildEvidenceOptions {
  inputPath: string;
  resolvedPath?: string;
  toolName?: string;
  toolVersion?: string;
}

function detectContainerDetail(buffer: Buffer): string | null {
  if (buffer.length < 12) {
    return null;
  }
  const ftypIndex = buffer.indexOf('ftyp', 4, 'ascii');
  if (ftypIndex === -1 || buffer.length < ftypIndex + 8) {
    return null;
  }
  return buffer.subarray(ftypIndex + 4, ftypIndex + 8).toString('ascii');
}

function detectContainer(extension: string, buffer: Buffer): {
  container: string | null;
  detail: string | null;
} {
  const container = CONTAINER_BY_EXTENSION[extension] ?? null;
  if (container === 'mp4' || container === 'quicktime') {
    return { container, detail: detectContainerDetail(buffer) };
  }
  return { container, detail: null };
}

function detectCodec(extension: string): string | null {
  return CODEC_BY_EXTENSION[extension] ?? null;
}

function detectMime(extension: string): string {
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
}

async function readScanBuffer(filePath: string): Promise<Buffer> {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const stats = await handle.stat();
    const size = Math.min(stats.size, MAX_SCAN_BYTES);
    const buffer = Buffer.alloc(Number(size));
    await handle.read(buffer, 0, buffer.length, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

export function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      hash.update(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
}

export async function buildMediaEvidence(
  options: BuildEvidenceOptions,
): Promise<MediaEvidenceResult> {
  const resolvedPath = options.resolvedPath ?? path.resolve(options.inputPath);
  const stats = await fs.promises.stat(resolvedPath);
  const scanBuffer = await readScanBuffer(resolvedPath);
  const extension = path.extname(resolvedPath).toLowerCase();
  const { container, detail } = detectContainer(extension, scanBuffer);
  const codec = detectCodec(extension);
  const mime = detectMime(extension);
  const sha256 = await hashFile(resolvedPath);

  const bufferText = scanBuffer.toString('latin1').toLowerCase();
  const markers = C2PA_MARKERS.filter((marker) => bufferText.includes(marker));
  const c2paPresent = markers.length > 0;
  const c2paStatus: C2paStatus = c2paPresent ? 'unverified' : 'absent';

  const warnings: string[] = [];
  if (c2paPresent) {
    warnings.push(
      'C2PA claims detected; verification intentionally constrained to detection-only.',
    );
  } else {
    warnings.push(
      'No C2PA claims detected; media authenticity must be established via provenance evidence.',
    );
  }

  const report: MediaReport = {
    schemaVersion: SCHEMA_VERSION,
    input: {
      path: options.inputPath,
      filename: path.basename(options.inputPath),
    },
    media: {
      sha256,
      sizeBytes: stats.size,
      mime,
      extension,
      container,
      containerDetail: detail,
      codec,
    },
    provenance: {
      c2pa: {
        present: c2paPresent,
        status: c2paStatus,
        markers,
      },
    },
    warnings,
  };

  const metrics: MetricsReport = {
    schemaVersion: SCHEMA_VERSION,
    counts: {
      files: 1,
      c2paPresent: c2paPresent ? 1 : 0,
      c2paUnverified: c2paPresent ? 1 : 0,
    },
  };

  const stamp: StampReport = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    input: {
      path: options.inputPath,
      resolvedPath,
    },
    fileTimestamps: {
      mtimeMs: stats.mtimeMs,
      ctimeMs: stats.ctimeMs,
    },
    tool: {
      name: options.toolName ?? 'summit',
      version: options.toolVersion ?? 'unknown',
    },
  };

  return { report, metrics, stamp };
}

export async function writeEvidenceArtifacts(
  outputDir: string,
  evidence: MediaEvidenceResult,
): Promise<void> {
  await fs.promises.mkdir(outputDir, { recursive: true });

  const reportPath = path.join(outputDir, 'report.json');
  const metricsPath = path.join(outputDir, 'metrics.json');
  const stampPath = path.join(outputDir, 'stamp.json');

  await fs.promises.writeFile(
    reportPath,
    `${JSON.stringify(evidence.report, null, 2)}\n`,
    'utf8',
  );
  await fs.promises.writeFile(
    metricsPath,
    `${JSON.stringify(evidence.metrics, null, 2)}\n`,
    'utf8',
  );
  await fs.promises.writeFile(
    stampPath,
    `${JSON.stringify(evidence.stamp, null, 2)}\n`,
    'utf8',
  );
}
