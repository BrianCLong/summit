import { Queue, Worker, Job } from 'bullmq';
import config from '../config/index.js';
import SocialService from './SocialService.js';

interface SocialJobData {
  provider: string;
  query: string;
  investigationId: string;
  host?: string;
  limit?: number;
}

interface QueueOptions {
  host?: string;
  limit?: number;
}

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
};

export const socialQueue = new Queue('social:ingest', { connection });

export function startWorkers(): Worker {
  const worker = new Worker(
    'social:ingest',
    async (job: Job<SocialJobData>) => {
      const { provider, query, investigationId, host, limit } = job.data || {};
      const svc = new SocialService();
      return await svc.queryProvider(provider, query, investigationId, {
        host,
        limit,
      });
    },
    { connection },
  );
  return worker;
}

export async function enqueueSocial(
  provider: string,
  query: string,
  investigationId: string,
  options: QueueOptions = {},
): Promise<string> {
  const job = await socialQueue.add(
    'ingest',
    { provider, query, investigationId, ...options },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
  );
  return job.id!;
}
