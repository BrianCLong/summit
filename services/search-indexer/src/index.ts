// @ts-nocheck

// ============================================================================
// SECURITY: Credential Validation
// ============================================================================

function requireSecret(name: string, value: string | undefined, minLength: number = 16): string {
  if (!value) {
    console.error(`FATAL: ${name} environment variable is required but not set`);
    console.error(`Set ${name} in your environment or .env file`);
    process.exit(1);
  }

  if (value.length < minLength) {
    console.error(`FATAL: ${name} must be at least ${minLength} characters`);
    console.error(`Current length: ${value.length}`);
    process.exit(1);
  }

  const insecureValues = ['password', 'secret', 'changeme', 'default', 'xyz', 'api-key'];
  if (insecureValues.some(v => value.toLowerCase().includes(v))) {
    console.error(`FATAL: ${name} is set to an insecure default value`);
    console.error(`Use a strong, unique secret (e.g., generated via: openssl rand -base64 32)`);
    process.exit(1);
  }

  return value;
}

import express from 'express';
import { Client } from 'typesense';
import Redis from 'ioredis';
import pino from 'pino';
import client from 'prom-client';

const logger = pino({ name: 'search-indexer' });
const app = express();

// Metrics
const registry = new client.Registry();
const indexerOpsTotal = new client.Counter({
  name: 'indexer_ops_total',
  help: 'Total number of indexing operations',
  labelNames: ['op', 'status'],
  registers: [registry],
});
const indexerLag = new client.Gauge({
  name: 'indexer_lag_seconds',
  help: 'Time lag of the indexer in seconds',
  registers: [registry],
});
const indexerDlqTotal = new client.Counter({
  name: 'indexer_dlq_total',
  help: 'Total number of messages sent to DLQ',
  registers: [registry],
});

// Typesense Client
const typesense = new Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: requireSecret('TYPESENSE_API_KEY', process.env.TYPESENSE_API_KEY, 16),
  connectionTimeoutSeconds: 5,
  numRetries: 3,
  retryIntervalSeconds: 0.1,
});

// Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Buffer Config
const BUFFER_SIZE = 50;
const BUFFER_TIMEOUT = 500;
let buffer: any[] = [];
let bufferTimer: NodeJS.Timeout | null = null;

async function addToBuffer(item: any) {
    buffer.push(item);
    if (buffer.length >= BUFFER_SIZE) {
        await flushBuffer();
    } else if (!bufferTimer) {
        bufferTimer = setTimeout(flushBuffer, BUFFER_TIMEOUT);
    }
}

async function flushBuffer() {
    if (bufferTimer) { clearTimeout(bufferTimer); bufferTimer = null; }
    if (buffer.length === 0) return;

    const currentBatch = [...buffer];
    buffer = [];

    // Group by collection and action
    const batches: Record<string, Record<string, any[]>> = {};

    for (const item of currentBatch) {
        const { type, action } = item.data;
        // Default to 'upsert' if action missing
        const act = action === 'delete' ? 'delete' : 'upsert';
        const collection = `${type}@current`;
        if (!batches[collection]) batches[collection] = {};
        if (!batches[collection][act]) batches[collection][act] = [];
        batches[collection][act].push(item);
    }

    for (const [collection, actions] of Object.entries(batches)) {
        // Handle Upserts
        if (actions['upsert']) {
            const items = actions['upsert'];
            try {
                const docs = items.map(i => {
                   const { tenant, type, id, revision, payload } = i.data;
                   return { ...payload, id, tenant, type, _revision: revision };
                });

                // Use import (upsert)
                const results = await typesense.collections(collection).documents().import(docs, { action: 'upsert' });

                let resultsArray: any[] = [];
                if (typeof results === 'string') {
                    // Typesense JS client might return a string of JSONL or array depending on version/config
                    // 1.8.2 usually returns array of objects for import()
                     try {
                        resultsArray = JSON.parse(results); // if single string
                     } catch {
                        // might be JSONL lines
                        resultsArray = results.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
                     }
                } else if (Array.isArray(results)) {
                    resultsArray = results;
                }

                for (let k = 0; k < items.length; k++) {
                    const item = items[k];
                    const res = resultsArray[k];
                    if (res && res.success) {
                        indexerOpsTotal.inc({ op: 'upsert', status: 'success' });
                        await redis.xack(item.streamKey, item.group, item.streamId);
                    } else {
                        // Failed item
                        throw new Error(res?.error || "Unknown error");
                    }
                }
            } catch (error: any) {
                logger.error({ error, collection }, "Batch upsert failed or partial failure");
                // DLQ Logic
                 for (const item of items) {
                     indexerOpsTotal.inc({ op: 'upsert', status: 'error' });
                     indexerDlqTotal.inc();
                     await redis.lpush('search:ingest:dlq', JSON.stringify({ ...item.data, error: error.message }));
                     await redis.xack(item.streamKey, item.group, item.streamId);
                 }
            }
        }

        // Handle Deletes
        if (actions['delete']) {
            const items = actions['delete'];
            try {
                const ids = items.map(i => i.data.id);
                // Filter empty IDs
                const validIds = ids.filter(id => id);
                if (validIds.length > 0) {
                     await typesense.collections(collection).documents().delete({ filter_by: `id:[${validIds.join(',')}]` });
                }

                for (const item of items) {
                    indexerOpsTotal.inc({ op: 'delete', status: 'success' });
                    await redis.xack(item.streamKey, item.group, item.streamId);
                }
            } catch (error: any) {
                 logger.error({ error, collection }, "Batch delete failed");
                 for (const item of items) {
                     indexerOpsTotal.inc({ op: 'delete', status: 'error' });
                     indexerDlqTotal.inc();
                     await redis.lpush('search:ingest:dlq', JSON.stringify({ ...item.data, error: error.message }));
                     await redis.xack(item.streamKey, item.group, item.streamId);
                 }
            }
        }
    }
}

// Queue Processing
async function processQueue() {
  const streamKey = 'search:ingest:stream';
  const group = 'search-indexer-group';
  const consumer = `consumer-${process.pid}`;

  try {
    try {
        await redis.xgroup('CREATE', streamKey, group, '$', 'MKSTREAM');
    } catch (e: any) {
        if (!e.message.includes('BUSYGROUP')) logger.warn(e, "Group creation warning");
    }

    logger.info("Starting queue processing...");

    while (true) {
        // Read new messages
        const results = await redis.xreadgroup('GROUP', group, consumer, 'COUNT', 50, 'BLOCK', 2000, 'STREAMS', streamKey, '>');
        if (results) {
            for (const [stream, messages] of results) {
                for (const [id, fields] of messages) {
                   let dataStr = "";
                   for(let i=0; i<fields.length; i+=2) {
                       if (fields[i] === 'data') dataStr = fields[i+1];
                   }

                   if (dataStr) {
                       try {
                           const data = JSON.parse(dataStr);
                           if (data.timestamp) {
                               indexerLag.set(Date.now() / 1000 - data.timestamp);
                           }
                           await addToBuffer({ data, streamId: id, streamKey, group });
                       } catch (err) {
                           logger.error({ err, id }, "Failed to parse message");
                           await redis.xack(streamKey, group, id);
                       }
                   } else {
                       await redis.xack(streamKey, group, id);
                   }
                }
            }
        }
    }

  } catch (error) {
    logger.error({ error }, 'Error processing queue');
    setTimeout(processQueue, 5000);
  }
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`Search indexer listening on port ${port}`);
  processQueue().catch(err => logger.error(err));
});
