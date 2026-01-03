import crypto from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import express, { type Application } from 'express';
import helmet from 'helmet';
import { createExport, ExportRequest } from './exporter';
import { createStreamingExport } from './streaming';

const app: Application = express();
app.use(express.json());
app.use(helmet());

const streamingEnabled = process.env.STREAMING_BULK_IO === '1';
const progressState = new Map<
  string,
  { bytesProcessed: number; percent?: number; stage: string }
>();
const checkpointByJob = new Map<string, string>();
const outputByJob = new Map<string, string>();

app.post('/export', async (req, res) => {
  const body = req.body as ExportRequest;
  const wantsStream =
    streamingEnabled && (String(req.query.stream || '') === '1' || req.headers['x-stream-bulk-io'] === '1');
  const rawJobId =
    (wantsStream && typeof req.query.jobId === 'string' && req.query.jobId.replace(/[^a-zA-Z0-9_-]/g, '_')) ||
    crypto.randomUUID();

  if (!wantsStream) {
    try {
      const zip = await createExport(body);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="export.zip"');
      res.send(zip);
    } catch (err) {
      console.error('Export request failed', err);
      res.status(400).json({ error: 'export_failed' });
    }
    return;
  }

  const baseDir = join(tmpdir(), 'streaming-exports');
  const checkpointPath =
    checkpointByJob.get(jobId) || join(baseDir, `${jobId}.checkpoint.json`);
  const outputPath =
    outputByJob.get(jobId) || join(baseDir, `${jobId}.zip`);
  checkpointByJob.set(jobId, checkpointPath);
  outputByJob.set(jobId, outputPath);

  try {
    await fs.mkdir(baseDir, { recursive: true });
    const result = await createStreamingExport(body, {
      outputPath,
      checkpointPath,
      onProgress: (progress) => {
        progressState.set(jobId, {
          bytesProcessed: progress.bytesProcessed,
          percent: progress.percent,
          stage: progress.stage,
        });
      },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="export.zip"');
    res.setHeader('X-Export-Job', jobId);
    res.setHeader('X-Export-Hash', result.hash);

    const stream = createReadStream(outputPath);
    stream.on('close', () => {
      progressState.set(jobId, {
        bytesProcessed: progressState.get(jobId)?.bytesProcessed ?? 0,
        percent: 100,
        stage: 'export',
      });
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Streaming export failed', err);
    res.status(400).json({ error: 'stream_export_failed', jobId });
  }
});

app.get('/export/progress/:jobId', async (req, res) => {
  if (!streamingEnabled) {
    return res.status(404).json({ error: 'streaming_disabled' });
  }
  const jobId = req.params.jobId;
  const progress = progressState.get(jobId) || null;
  const checkpointPath = checkpointByJob.get(jobId) || null;
  let checkpoint: { bytesProcessed?: number; percent?: number } | null = null;
  if (checkpointPath) {
    try {
      const raw = await fs.readFile(checkpointPath, 'utf-8');
      const parsed = JSON.parse(raw);
      checkpoint = {
        bytesProcessed: parsed.bytesProcessed,
        percent: progress?.percent,
      };
    } catch {
      checkpoint = null;
    }
  }
  res.json({
    jobId,
    progress,
    checkpoint,
  });
});

export default app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Exporter listening on ${port}`));
}
