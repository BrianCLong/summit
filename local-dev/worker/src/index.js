import express from 'express';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import fetch from 'node-fetch';
import pino from 'pino';
import dotenv from 'dotenv';

dotenv.config();

const logger = pino({ name: 'devkit-worker', level: process.env.LOG_LEVEL ?? 'info' });
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const apiHealthUrl = process.env.API_HEALTH_URL ?? 'http://localhost:4000/health';
const port = Number(process.env.PORT ?? 7000);
const queueName = process.env.QUEUE_NAME ?? 'devkit-jobs';

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const queue = new Queue(queueName, { connection });
const state = {
  redis: false,
  api: false,
  lastHeartbeat: null,
  processedJobs: 0,
  lastJobPayload: null
};

const worker = new Worker(
  queueName,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'processing job');
    state.lastJobPayload = job.data;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { ok: true, at: new Date().toISOString() };
  },
  { connection }
);

worker.on('completed', (job) => {
  state.processedJobs += 1;
  logger.info({ jobId: job.id }, 'job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'job failed');
});

async function enqueueHeartbeat() {
  try {
    await queue.add('heartbeat', { issuedAt: new Date().toISOString() }, { removeOnComplete: true, removeOnFail: true });
  } catch (err) {
    logger.error({ err }, 'failed to enqueue heartbeat job');
  }
}

async function checkRedis() {
  try {
    await connection.ping();
    state.redis = true;
  } catch (err) {
    state.redis = false;
    logger.warn({ err }, 'redis ping failed');
  }
}

async function checkApi() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(apiHealthUrl, { signal: controller.signal });
    state.api = response.ok;
  } catch (err) {
    state.api = false;
    logger.warn({ err }, 'api health check failed');
  } finally {
    clearTimeout(timeout);
  }
}

setInterval(async () => {
  await enqueueHeartbeat();
  await Promise.all([checkRedis(), checkApi()]);
  state.lastHeartbeat = new Date().toISOString();
}, 15000);

enqueueHeartbeat().catch((err) => logger.error({ err }, 'initial heartbeat failed'));
checkRedis().catch((err) => logger.error({ err }, 'initial redis check failed'));
checkApi().catch((err) => logger.error({ err }, 'initial api check failed'));

const app = express();
app.get('/health', (req, res) => {
  const healthy = state.redis && state.api;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    components: {
      redis: state.redis,
      api: state.api
    },
    processedJobs: state.processedJobs,
    lastJobPayload: state.lastJobPayload,
    lastHeartbeat: state.lastHeartbeat
  });
});

app.get('/metrics', (req, res) => {
  res.type('text/plain').send(
    `# HELP devkit_worker_processed_jobs_total Total jobs processed by the devkit worker\n` +
      `# TYPE devkit_worker_processed_jobs_total counter\n` +
      `devkit_worker_processed_jobs_total ${state.processedJobs}\n`
  );
});

app.listen(port, () => {
  logger.info({ port }, 'devkit worker listening');
});

async function shutdown(signal) {
  logger.info({ signal }, 'shutting down devkit worker');
  try {
    await worker.close();
    await queue.close();
    await connection.quit();
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
