import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import zlib from 'zlib';
import type { Logger } from 'pino';

const pump = promisify(pipeline);

export interface RetentionPolicy {
  directory: string;
  retentionDays: number;
  compressAfterDays: number;
  maxTotalSizeMb: number;
}

async function compressOldLogs(directory: string, compressAfterDays: number, logger: Logger): Promise<void> {
  const files = await fs.promises.readdir(directory);
  const now = Date.now();
  await Promise.all(
    files
      .filter((file) => file.endsWith('.log'))
      .map(async (file) => {
        const fullPath = path.join(directory, file);
        const stats = await fs.promises.stat(fullPath);
        const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageDays < compressAfterDays) return;
        const gzPath = `${fullPath}.gz`;
        if (fs.existsSync(gzPath)) return;

        await pump(fs.createReadStream(fullPath), zlib.createGzip(), fs.createWriteStream(gzPath));
        await fs.promises.unlink(fullPath);
        logger.info({ file }, 'Compressed old log file');
      }),
  );
}

async function deleteExpiredLogs(directory: string, retentionDays: number, logger: Logger): Promise<void> {
  const files = await fs.promises.readdir(directory);
  const now = Date.now();

  await Promise.all(
    files
      .filter((file) => file.endsWith('.gz') || file.endsWith('.log'))
      .map(async (file) => {
        const fullPath = path.join(directory, file);
        const stats = await fs.promises.stat(fullPath);
        const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageDays > retentionDays) {
          await fs.promises.unlink(fullPath);
          logger.warn({ file }, 'Removed log due to retention policy');
        }
      }),
  );
}

async function enforceSizeLimit(directory: string, maxTotalSizeMb: number, logger: Logger): Promise<void> {
  const files = await fs.promises.readdir(directory);
  const entries = await Promise.all(
    files
      .filter((file) => file.endsWith('.gz') || file.endsWith('.log'))
      .map(async (file) => ({
        file,
        fullPath: path.join(directory, file),
        stats: await fs.promises.stat(path.join(directory, file)),
      })),
  );

  let totalBytes = entries.reduce((acc, entry) => acc + entry.stats.size, 0);
  const maxBytes = maxTotalSizeMb * 1024 * 1024;

  if (totalBytes <= maxBytes) return;

  // delete oldest until under limit
  const sorted = entries.sort((a, b) => a.stats.mtimeMs - b.stats.mtimeMs);
  for (const entry of sorted) {
    if (totalBytes <= maxBytes) break;
    await fs.promises.unlink(entry.fullPath);
    totalBytes -= entry.stats.size;
    logger.warn({ file: entry.file }, 'Removed log to enforce size cap');
  }
}

export async function enforceRetention(policy: RetentionPolicy, logger: Logger): Promise<void> {
  await fs.promises.mkdir(policy.directory, { recursive: true });
  await compressOldLogs(policy.directory, policy.compressAfterDays, logger);
  await deleteExpiredLogs(policy.directory, policy.retentionDays, logger);
  await enforceSizeLimit(policy.directory, policy.maxTotalSizeMb, logger);
}

export function scheduleRetention(policy: RetentionPolicy, logger: Logger): () => void {
  const intervalMinutes = Number(process.env.LOG_RETENTION_CHECK_MINUTES ?? '30');
  enforceRetention(policy, logger).catch((error) => logger.error({ error }, 'Failed to enforce retention'));
  const handle = setInterval(() => {
    enforceRetention(policy, logger).catch((error) => logger.error({ error }, 'Failed to enforce retention'));
  }, intervalMinutes * 60 * 1000);
  // allow process exit in tests and short-lived commands
  if (typeof handle.unref === 'function') {
    handle.unref();
  }

  return () => clearInterval(handle);
}
