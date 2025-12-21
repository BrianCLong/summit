import { Worker, Queue } from 'bullmq';
import { connect, NatsConnection, JSONCodec, JetStreamClient } from 'nats';
import { CsvConnector } from './connectors/csv.js';
import { RssConnector } from './connectors/rss.js';
import { MispConnector } from './connectors/misp.js';
import { IngestConnector } from '@intelgraph/ingest-connector-sdk';
import Redis from 'ioredis';
import crypto from 'crypto';
import { ingestQueue } from './queue.js';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';

const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

// Telemetry
const metrics = {
    throughput: {} as Record<string, number>,
    lag: {} as Record<string, number>,
    dlq: {} as Record<string, number>,
    errors: {} as Record<string, number>
};

// Circuit Breaker State
const circuitBreaker = {
    threshold: 5,
    resetTimeout: 60000,
    state: {} as Record<string, { failures: number, nextAttempt: number }>
};

const connectors: Record<string, IngestConnector> = {
  'csv': new CsvConnector(),
  'rss': new RssConnector(),
  'misp': new MispConnector()
};

function generateHash(content: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

async function isDuplicate(sourceKey: string, contentHash: string): Promise<boolean> {
    const key = `ingest:seen:${sourceKey}:${contentHash}`;
    const exists = await connection.exists(key);
    if (exists) return true;
    await connection.setex(key, 86400, '1');
    return false;
}

function checkCircuitBreaker(connectorName: string): boolean {
    const cb = circuitBreaker.state[connectorName];
    if (!cb) return true;
    if (cb.failures >= circuitBreaker.threshold) {
        if (Date.now() < cb.nextAttempt) {
            console.warn(`Circuit breaker open for ${connectorName}`);
            return false;
        } else {
            // Reset probe
            cb.failures = 0;
            return true;
        }
    }
    return true;
}

function recordFailure(connectorName: string) {
    if (!circuitBreaker.state[connectorName]) {
        circuitBreaker.state[connectorName] = { failures: 0, nextAttempt: 0 };
    }
    const cb = circuitBreaker.state[connectorName];
    cb.failures++;
    if (cb.failures >= circuitBreaker.threshold) {
        cb.nextAttempt = Date.now() + circuitBreaker.resetTimeout;
    }
}

function recordSuccess(connectorName: string) {
    if (circuitBreaker.state[connectorName]) {
        circuitBreaker.state[connectorName].failures = 0;
    }
}

async function scheduleIngest(connectorName: string, resource: any) {
    await ingestQueue.add('pull', { connectorName, resource });
}

export async function start() {
  console.log('Starting Ingest Runner...');

  // Setup NATS JetStream
  let nc: NatsConnection | undefined;
  let js: JetStreamClient | undefined;
  try {
    nc = await connect({ servers: NATS_URL });
    js = nc.jetstream();
    console.log('Connected to NATS JetStream');
  } catch (err) {
    console.warn('NATS connection failed (mocking?):', err);
  }

  const jc = JSONCodec();

  // Metrics Loop
  setInterval(() => {
    console.log('[Telemetry]', JSON.stringify(metrics));
  }, 10000);

  // BullMQ Worker
  const worker = new Worker('ingest-jobs', async job => {
    const { connectorName, resource, resourceId } = job.data;
    const connector = connectors[connectorName];

    if (!connector) {
      throw new Error(`Connector ${connectorName} not found`);
    }

    if (process.env[`CONNECTOR_${connectorName.toUpperCase()}`] !== 'true') {
        console.log(`Connector ${connectorName} is disabled via feature flag.`);
        return;
    }

    if (!checkCircuitBreaker(connectorName)) {
        throw new Error(`Circuit breaker open for ${connectorName}`);
    }

    console.log(`Processing ${connectorName} for ${resource?.id || resourceId || 'discovery'}`);

    try {
        if (!resource && !resourceId) {
            // Discovery Phase
            const resources = await connector.discover();
            console.log(`Discovered ${resources.length} resources for ${connectorName}`);

            // Enqueue pull jobs
            for (const res of resources) {
                await scheduleIngest(connectorName, res);
            }
            recordSuccess(connectorName);
            return resources;
        } else {
            // Pull Phase
            // If resource object is passed, use it. If only ID (legacy), lookup.
            let targetResource = resource;
            if (!targetResource && resourceId) {
                 const resources = await connector.discover();
                 targetResource = resources.find(r => r.id === resourceId);
            }

            if (targetResource) {
                let count = 0;
                for await (const record of connector.pull(targetResource)) {
                    const hash = generateHash(record.data);
                    const duplicate = await isDuplicate(record.id, hash);

                    if (duplicate) {
                        continue;
                    }

                    // Emit to JetStream
                    if (js) {
                        await js.publish('ingest.events', jc.encode(record));
                    } else {
                        // Fail if sink is missing to trigger retry
                        throw new Error('JetStream client not available, cannot publish event');
                    }
                    count++;
                }

                // Checkpoint (v1: Basic state persistence via Redis if needed, or relying on dedupe)
                // In v2, we should call connector.checkpoint() and store it.
                // await connector.checkpoint(state);

                console.log(`Ingested ${count} records from ${targetResource.id}`);
                metrics.throughput[connectorName] = (metrics.throughput[connectorName] || 0) + count;
                recordSuccess(connectorName);
            }
        }
    } catch (error) {
        console.error(`Error in job ${job.id}:`, error);
        metrics.dlq[connectorName] = (metrics.dlq[connectorName] || 0) + 1;
        recordFailure(connectorName);
        throw error;
    }

  }, { connection });

  worker.on('completed', job => {
    // console.log(`${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.log(`${job?.id} failed: ${err?.message}`);
  });

  console.log('Ingest Runner started.');
  return worker;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(console.error);
}
