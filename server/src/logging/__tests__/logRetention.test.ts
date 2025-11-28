import fs from 'fs';
import os from 'os';
import path from 'path';
import pino from 'pino';
import { enforceRetention } from '../logRetention.js';

describe('log retention', () => {
  const logger = pino({ level: 'silent' });
  let tempDir: string;

  const createFile = (name: string, sizeBytes: number, daysAgo: number) => {
    const fullPath = path.join(tempDir, name);
    fs.writeFileSync(fullPath, 'x'.repeat(sizeBytes));
    const time = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    fs.utimesSync(fullPath, time / 1000, time / 1000);
    return fullPath;
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logs-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('compresses, deletes expired logs, and enforces size cap', async () => {
    createFile('expired.log', 128, 5);
    createFile('compress.log', 256, 2);
    createFile('keep.log', 700_000, 0);
    createFile('big.log', 700_000, 3);

    await enforceRetention(
      {
        directory: tempDir,
        retentionDays: 1,
        compressAfterDays: 1,
        maxTotalSizeMb: 1,
      },
      logger,
    );

    const files = await fs.promises.readdir(tempDir);

    // expired.log should be removed due to age
    expect(files).not.toContain('expired.log');

    // compress.log should be gzipped and original removed
    expect(files).toContain('compress.log.gz');
    expect(files).not.toContain('compress.log');

    // size enforcement should remove the oldest large file to get under the cap
    expect(files).not.toContain('big.log');
    expect(files).toContain('keep.log');
  });
});
