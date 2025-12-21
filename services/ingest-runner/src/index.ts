import { Worker, Queue } from 'bullmq';
import { connect, NatsConnection } from 'nats';
import { CsvConnector } from './connectors/csv.js';
import { RssConnector } from './connectors/rss.js';
import { MispConnector } from './connectors/misp.js';
import { IngestConnector } from '@intelgraph/ingest-connector-sdk';
import { scheduleIngest } from './queue.js';
import Redis from 'ioredis';
import crypto from 'crypto';
import avro from 'avsc';
import fs from 'fs';
import path from 'path';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';

const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

// Load Avro Schema
const schemaPaths = [
    path.resolve(process.cwd(), 'schema/ingest-event.avsc'),
    path.resolve(process.cwd(), '../../packages/ingest-connector-sdk/schema/ingest-event.avsc'),
    path.resolve(process.cwd(), '../packages/ingest-connector-sdk/schema/ingest-event.avsc')
];

let type: avro.Type;
let loadedSchema = false;

for (const p of schemaPaths) {
    if (fs.existsSync(p)) {
        try {
            type = avro.Type.forSchema(JSON.parse(fs.readFileSync(p, 'utf8')));
            console.log(`Loaded Avro schema from ${p}`);
            loadedSchema = true;
            break;
        } catch (e) {
            console.warn(`Failed to parse schema at ${p}`, e);
        }
    }
}

if (!loadedSchema) {
    console.warn('Avro schema file not found, using embedded fallback.');
    type = avro.Type.forSchema({
        type: 'record',
        name: 'IngestEvent',
        fields: [
            { name: 'id', type: 'string' },
            { name: 'extractedAt', type: 'long', logicalType: 'timestamp-millis' },
            { name: 'sourceId', type: 'string' },
            { name: 'connectorType', type: 'string' },
            { name: 'data', type: 'string' },
            { name: 'metadata', type: ['null', { type: 'map', values: 'string' }], default: null }
        ]
    });
}


// Telemetry placeholders
const metrics = {
    throughput: {} as Record<string, number>,
    lag: {} as Record<string, number>,
    dlq: {} as Record<string, number>,
    errors: {} as Record<string, number>
};

// Circuit Breaker Config
const CB_THRESHOLD = 10; // Max errors before opening
const CB_RESET_TIMEOUT = 30000; // 30s
const cbState: Record<string, number> = {}; // timestamp when it opens

// Log metrics periodically
setInterval(() => {
    console.log('Metrics:', JSON.stringify(metrics));
}, 60000);

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

async function getCheckpoint(resourceId: string): Promise<any> {
    const key = `ingest:checkpoint:${resourceId}`;
    const data = await connection.get(key);
    return data ? JSON.parse(data) : undefined;
}

async function saveCheckpoint(resourceId: string, state: any) {
    const key = `ingest:checkpoint:${resourceId}`;
    await connection.set(key, JSON.stringify(state));
}

function checkCircuitBreaker(connectorName: string): boolean {
    const openUntil = cbState[connectorName];
    if (openUntil && Date.now() < openUntil) {
        return true; // Open
    }
    if (openUntil && Date.now() >= openUntil) {
        delete cbState[connectorName]; // Reset
        metrics.errors[connectorName] = 0; // Reset error count
    }
    return false;
}

function tripCircuitBreaker(connectorName: string) {
    metrics.errors[connectorName] = (metrics.errors[connectorName] || 0) + 1;
    if (metrics.errors[connectorName] > CB_THRESHOLD) {
        console.warn(`Circuit breaker tripped for ${connectorName}`);
        cbState[connectorName] = Date.now() + CB_RESET_TIMEOUT;
    }
}

export async function start() {
  console.log('Starting Ingest Runner...');

  // Setup NATS
  let nc: NatsConnection | undefined;
  try {
    nc = await connect({ servers: NATS_URL });
    console.log('Connected to NATS');
  } catch (err) {
    console.warn('NATS connection failed:', err);
    // Note: We do NOT throw here to allow the service to start if NATS is temporarily down,
    // BUT we will enforce NATS presence in the worker loop.
  }

  // BullMQ Worker
  const worker = new Worker('ingest-jobs', async job => {
    // CRITICAL: Ensure NATS is available before processing to prevent data loss
    if (!nc || nc.isClosed()) {
        try {
            console.log('NATS not connected, attempting reconnect...');
            nc = await connect({ servers: NATS_URL });
            console.log('Reconnected to NATS');
        } catch (e) {
            throw new Error('NATS connection required for ingestion. Retrying job.');
        }
    }

    const { connectorName, resourceId } = job.data;

    // Check Circuit Breaker
    if (checkCircuitBreaker(connectorName)) {
        console.warn(`Skipping job for ${connectorName} due to open circuit breaker.`);
        throw new Error('Circuit Breaker Open');
    }

    const connector = connectors[connectorName];

    if (!connector) {
        throw new Error(`Connector ${connectorName} not found`);
    }

    if (process.env[`CONNECTOR_${connectorName.toUpperCase()}`] !== 'true') {
        console.log(`Connector ${connectorName} is disabled via feature flag.`);
        return;
    }

    console.log(`Processing ${connectorName} for ${resourceId}`);

    try {
        if (!resourceId) {
            // Discovery Phase
            const resources = await connector.discover();
            console.log('Discovered resources:', resources);
            for (const res of resources) {
                await scheduleIngest(connectorName, res.id);
            }
            return resources;
        } else {
            // Pull Phase
            const resources = await connector.discover();
            const resource = resources.find(r => r.id === resourceId);

            if (resource) {
                // Load checkpoint
                const state = await getCheckpoint(resourceId);

                let count = 0;
                let lastRecord = null;

                for await (const record of connector.pull(resource, state)) {
                    const hash = generateHash(record.data);
                    const duplicate = await isDuplicate(record.id, hash);

                    if (duplicate) {
                        continue;
                    }

                    // Emit to NATS using Avro
                    const event = {
                        id: record.id,
                        extractedAt: record.extractedAt.getTime(),
                        sourceId: resourceId,
                        connectorType: connectorName,
                        data: JSON.stringify(record.data),
                        metadata: record.metadata || null
                    };
                    try {
                        const buf = type.toBuffer(event);
                        nc.publish('ingest.events', buf);
                    } catch (err) {
                        console.error('Avro serialization error', err);
                        // If we can't serialize, we shouldn't checkpoint this record?
                        // For v1 we log and continue, but strict schema might demand failure.
                        // Throwing here ensures we don't ack invalid data.
                        throw new Error(`Avro serialization failed: ${err}`);
                    }

                    count++;
                    lastRecord = record;

                    // Periodic checkpointing
                    if (count % 100 === 0) {
                        const newState = { cursor: record.id, timestamp: Date.now() };
                        const cp = await connector.checkpoint(newState);
                        await connector.ack(cp);
                        await saveCheckpoint(resourceId, newState);
                    }
                }

                // Final checkpoint/ack
                if (count > 0 && lastRecord) {
                   const newState = { cursor: lastRecord.id, timestamp: Date.now() };
                   const cp = await connector.checkpoint(newState);
                   await connector.ack(cp);
                   await saveCheckpoint(resourceId, newState);
                }

                metrics.throughput[connectorName] = (metrics.throughput[connectorName] || 0) + count;
            }
        }
    } catch (error) {
        console.error(`Error in job ${job.id}:`, error);
        metrics.dlq[connectorName] = (metrics.dlq[connectorName] || 0) + 1;
        tripCircuitBreaker(connectorName);
        throw error;
    }

  }, { connection });

  worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.log(`${job?.id} has failed with ${err?.message}`);
  });

  // Schedule initial discovery jobs for enabled connectors
  for (const name of Object.keys(connectors)) {
      if (process.env[`CONNECTOR_${name.toUpperCase()}`] === 'true') {
          console.log(`Scheduling initial discovery for ${name}`);
          await scheduleIngest(name);
      }
  }

  console.log('Ingest Runner started.');
  return worker;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(console.error);
}
