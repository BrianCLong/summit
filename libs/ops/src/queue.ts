import crypto from "node:crypto";
import Redis from "ioredis";
import { queueDepth } from "./metrics-queue.js";

export interface QueueClient {
  lpush(key: string, value: string): Promise<number>;
  llen(key: string): Promise<number>;
}

export interface QueueJob<Payload = unknown> {
  id?: string;
  type: string;
  payload: Payload;
  enqueuedAt?: number;
}

function buildQueueClient(): QueueClient | null {
  if (process.env.FLAG_SCALE_KEDA !== "1") {
    return null;
  }

  const address = process.env.REDIS_ADDR;
  if (!address) {
    console.warn("queue_disabled_no_address");
    return null;
  }

  return new Redis(address, { password: process.env.REDIS_PASS });
}

let queueClient = buildQueueClient();

export async function enqueue(job: QueueJob): Promise<string | null> {
  if (!queueClient) {
    return null;
  }

  if (!job.type) {
    throw new Error("queue_job_missing_type");
  }

  const id = job.id ?? crypto.randomUUID();
  const enrichedJob: QueueJob = {
    ...job,
    id,
    enqueuedAt: job.enqueuedAt ?? Date.now(),
  };

  await queueClient.lpush("jobs", JSON.stringify(enrichedJob));
  const depth = await queueClient.llen("jobs");
  queueDepth.set(depth);
  return id;
}

export function getQueueClient(): QueueClient | null {
  return queueClient;
}

export function setQueueClient(client: QueueClient | null): void {
  queueClient = client;
}
