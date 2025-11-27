import express from 'express';
import multer from 'multer';
import { Queue } from 'bullmq';
import { getRedisClient } from '@intelgraph/redis';
import path from 'path';
import client from 'prom-client';

const app = express();
const port = process.env.PORT || 4012;

const redisClient = getRedisClient();
const ingestionQueue = new Queue('ingestion-queue', { connection: redisClient });

const upload = multer({ dest: 'uploads/' });

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const ingestJobsCreated = new client.Counter({
  name: 'ingest_jobs_created_total',
  help: 'Total number of ingest jobs created',
});
register.registerMetric(ingestJobsCreated);

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.post('/ingest', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const job = await ingestionQueue.add('ingest-job', {
    filePath: req.file.path,
    config: JSON.parse(req.body.config),
  });

  ingestJobsCreated.inc();
  res.status(201).json({ jobId: job.id });
});

app.listen(port, () => {
  console.log(`Ingestion API listening at http://localhost:${port}`);
});
