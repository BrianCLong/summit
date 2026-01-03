import Redis from 'ioredis';
import { jobMetrics } from '../../packages/agentic-rag/src/observability/instrumentation.js';
import { DeterministicEmbedder, ingestCorpus } from '../../packages/agentic-rag/src/index.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);
const dlq = new Redis(redisUrl);
const queueKey = 'agentic-rag:jobs';
const dlqKey = 'agentic-rag:dlq';
const concurrency = Number(process.env.AGENTIC_RAG_WORKER_CONCURRENCY || 2);

async function processJob(payload: any) {
  const embedder = new DeterministicEmbedder();
  if (payload.type === 'embed') {
    const vector = await embedder.embed(payload.text);
    return { vector };
  }
  if (payload.type === 'ingest') {
    return ingestCorpus(payload.options);
  }
  throw new Error(`Unknown job type ${payload.type}`);
}

async function workerLoop() {
  const workers = Array.from({ length: concurrency }).map(async () => {
    while (true) {
      const item = await redis.brpop(queueKey, 0);
      if (!item) continue;
      const [, raw] = item;
      jobMetrics.queued.inc();
      const job = JSON.parse(raw);
      try {
        const result = await processJob(job.payload);
        jobMetrics.completed.inc();
        if (job.replyTo) {
          await redis.lpush(job.replyTo, JSON.stringify({ id: job.id, result }));
        }
      } catch (error) {
        jobMetrics.failed.inc();
        await dlq.lpush(dlqKey, JSON.stringify({ job, error: (error as Error).message }));
      }
    }
  });
  await Promise.all(workers);
}

workerLoop().catch((error) => {
  console.error(error);
  process.exit(1);
});

