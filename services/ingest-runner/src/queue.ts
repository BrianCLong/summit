import { Queue } from 'bullmq';
import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

export const ingestQueue = new Queue('ingest-jobs', {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000 // 1s, 2s, 4s...
        },
        removeOnComplete: true
    }
});

export async function scheduleIngest(connectorName: string, resourceId?: string) {
    await ingestQueue.add('pull', { connectorName, resourceId });
}
