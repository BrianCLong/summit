import IORedis from 'ioredis';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { jobMetrics, DeterministicEmbedder, ingestCorpus } from '@intelgraph/agentic-rag';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const queueName = process.env.AGENTIC_RAG_QUEUE_NAME || 'agentic-rag';
const dlqName = `${queueName}:dlq`;
const concurrency = Number(process.env.AGENTIC_RAG_WORKER_CONCURRENCY || 2);
const attempts = Number(process.env.AGENTIC_RAG_JOB_ATTEMPTS || 3);
const backoffDelay = Number(process.env.AGENTIC_RAG_JOB_BACKOFF_MS || 5000);

const queue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    attempts,
    backoff: { type: 'exponential', delay: backoffDelay },
    removeOnComplete: 1000,
    removeOnFail: false,
  },
});
const deadLetterQueue = new Queue(dlqName, { connection });

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

const worker = new Worker(
  queueName,
  async (job) => {
    jobMetrics.queued.inc();
    jobMetrics.active.inc();
    const started = performance.now();
    try {
      return await processJob(job.data);
    } finally {
      jobMetrics.active.dec();
      jobMetrics.durationMs.observe(performance.now() - started);
    }
  },
  { connection, concurrency }
);

worker.on('completed', () => {
  jobMetrics.completed.inc();
});

worker.on('failed', () => {
  jobMetrics.failed.inc();
});

const events = new QueueEvents(queueName, { connection });
events.on('failed', async ({ jobId, failedReason }) => {
  const job = await queue.getJob(jobId as string);
  if (!job) return;
  await deadLetterQueue.add(
    'dead-letter',
    {
      jobId: job.id,
      idempotencyKey: job.opts.jobId,
      failedReason,
      payload: job.data,
    },
    { jobId: `dlq:${job.id}` }
  );
});

const run = async () => {
  await queue.waitUntilReady();
  await worker.waitUntilReady();
  await events.waitUntilReady();
  console.log(
    JSON.stringify({
      event: 'agentic_rag_worker_ready',
      queueName,
      concurrency,
      attempts,
      backoffDelay,
    })
  );
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
