/**
 * AI-specific caching utilities for performance optimization
 */
import { createClient } from 'redis';

let redisClient: any = null;

export function setupAICaching(redis: any) {
  redisClient = redis;
  console.log('AI caching layer initialized');
}

// Cache ML job results for quick retrieval
export async function cacheJobResult(jobId: string, result: any, ttlSeconds: number = 3600) {
  if (!redisClient) return;

  try {
    const key = `ai:job:${jobId}`;
    await redisClient.setex(key, ttlSeconds, JSON.stringify(result));
  } catch (error) {
    console.error('Failed to cache job result:', error);
  }
}

export async function getCachedJobResult(jobId: string) {
  if (!redisClient) return null;

  try {
    const key = `ai:job:${jobId}`;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Failed to get cached job result:', error);
    return null;
  }
}

// Cache graph snapshots for ML processing
export async function cacheGraphSnapshot(
  snapshotId: string,
  edges: any[],
  ttlSeconds: number = 1800,
) {
  if (!redisClient) return;

  try {
    const key = `ai:graph:${snapshotId}`;
    await redisClient.setex(key, ttlSeconds, JSON.stringify(edges));
  } catch (error) {
    console.error('Failed to cache graph snapshot:', error);
  }
}

export async function getCachedGraphSnapshot(snapshotId: string) {
  if (!redisClient) return null;

  try {
    const key = `ai:graph:${snapshotId}`;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Failed to get cached graph snapshot:', error);
    return null;
  }
}

// Cache ML model predictions
export async function cachePrediction(
  predictionKey: string,
  prediction: any,
  ttlSeconds: number = 7200,
) {
  if (!redisClient) return;

  try {
    const key = `ai:prediction:${predictionKey}`;
    await redisClient.setex(key, ttlSeconds, JSON.stringify(prediction));
  } catch (error) {
    console.error('Failed to cache prediction:', error);
  }
}

export async function getCachedPrediction(predictionKey: string) {
  if (!redisClient) return null;

  try {
    const key = `ai:prediction:${predictionKey}`;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Failed to get cached prediction:', error);
    return null;
  }
}

// Rate limiting for ML endpoints
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxRequests: number = 100,
  windowSeconds: number = 3600,
): Promise<boolean> {
  if (!redisClient) return true; // Allow if no Redis

  try {
    const key = `ai:rate:${userId}:${endpoint}`;
    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    return current <= maxRequests;
  } catch (error) {
    console.error('Failed to check rate limit:', error);
    return true; // Allow on error
  }
}

// Queue management for ML tasks
export async function queueMLTask(taskId: string, taskData: any) {
  if (!redisClient) return;

  try {
    const queueKey = 'ai:queue:ml_tasks';
    const taskKey = `ai:task:${taskId}`;

    await redisClient.lpush(queueKey, taskId);
    await redisClient.setex(taskKey, 3600, JSON.stringify(taskData));
  } catch (error) {
    console.error('Failed to queue ML task:', error);
  }
}

export async function dequeueMLTask(): Promise<{ taskId: string; taskData: any } | null> {
  if (!redisClient) return null;

  try {
    const queueKey = 'ai:queue:ml_tasks';
    const taskId = await redisClient.rpop(queueKey);

    if (!taskId) return null;

    const taskKey = `ai:task:${taskId}`;
    const taskData = await redisClient.get(taskKey);
    await redisClient.del(taskKey);

    return {
      taskId,
      taskData: taskData ? JSON.parse(taskData) : null,
    };
  } catch (error) {
    console.error('Failed to dequeue ML task:', error);
    return null;
  }
}
