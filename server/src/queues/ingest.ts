import { getRedisClient } from '../db/redis.js';

const redisClient = getRedisClient();
const INGEST_QUEUE_NAME = 'ingest-queue';

export const addIngestJob = async (data: any) => {
  // Use a simple Redis LPUSH to add the job to the queue.
  // The Python worker will use BLPOP to consume it.
  await redisClient.lpush(INGEST_QUEUE_NAME, JSON.stringify(data));
};
