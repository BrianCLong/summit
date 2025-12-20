import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createExport, ExportRequest } from '../src/exporter';
import {
  createStreamingExport,
  verifyImportWithCheckpoint,
} from '../src/streaming';

const sample: ExportRequest = {
  entities: [{ id: '1', name: 'Alice', secret: 's1' }],
  edges: [{ source: '1', target: '2', weight: 5, secret: 'e1' }],
  redactRules: [{ field: 'secret', action: 'drop' }],
  format: ['json', 'csv', 'pdf'],
};

describe('streaming export', () => {
  it('supports chunked hashing with resume and verifies import integrity', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'export-stream-'));
    const outputPath = path.join(tmpDir, 'export.zip');
    const checkpointPath = path.join(tmpDir, 'checkpoint.json');

    const controller = new AbortController();
    const progressSeen: number[] = [];

    await expect(
      createStreamingExport(sample, {
        outputPath,
        checkpointPath,
        chunkSize: 1024,
        signal: controller.signal,
        onProgress: (progress) => {
          progressSeen.push(progress.bytesProcessed);
          controller.abort();
        },
      }),
    ).rejects.toThrow();

    const initialCheckpoint = JSON.parse(
      await fs.readFile(checkpointPath, 'utf-8'),
    );
    expect(initialCheckpoint.bytesProcessed).toBeGreaterThan(0);
    const partialSize = (await fs.stat(outputPath)).size;
    expect(partialSize).toBeLessThanOrEqual(initialCheckpoint.bytesProcessed);
    expect(progressSeen.length).toBeGreaterThan(0);

    const completed = await createStreamingExport(sample, {
      outputPath,
      checkpointPath,
      chunkSize: 1024,
    });

    const finalCheckpoint = JSON.parse(
      await fs.readFile(checkpointPath, 'utf-8'),
    );
    expect(finalCheckpoint.completed).toBe(true);
    expect(finalCheckpoint.hash).toBe(completed.hash);

    const finalHash = createHash('sha256')
      .update(await fs.readFile(outputPath))
      .digest('hex');
    expect(finalHash).toBe(completed.hash);

    const baseline = await createExport(sample);
    const baselineHash = createHash('sha256').update(baseline).digest('hex');
    expect(baselineHash).toBe(finalHash);

    const importCheckpoint = path.join(tmpDir, 'import-checkpoint.json');
    const importResult = await verifyImportWithCheckpoint(
      outputPath,
      importCheckpoint,
      { chunkSize: 1024 },
    );
    expect(importResult.hash).toBe(finalHash);
    expect(importResult.chunkHashes.length).toBeGreaterThan(0);
  });
});
