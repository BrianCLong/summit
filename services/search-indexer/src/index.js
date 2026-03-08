"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const typesense_1 = require("typesense");
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const prom_client_1 = __importDefault(require("prom-client"));
const logger = (0, pino_1.default)({ name: 'search-indexer' });
const app = (0, express_1.default)();
// Metrics
const registry = new prom_client_1.default.Registry();
const indexerOpsTotal = new prom_client_1.default.Counter({
    name: 'indexer_ops_total',
    help: 'Total number of indexing operations',
    labelNames: ['op', 'status'],
    registers: [registry],
});
const indexerLag = new prom_client_1.default.Gauge({
    name: 'indexer_lag_seconds',
    help: 'Time lag of the indexer in seconds',
    registers: [registry],
});
const indexerDlqTotal = new prom_client_1.default.Counter({
    name: 'indexer_dlq_total',
    help: 'Total number of messages sent to DLQ',
    registers: [registry],
});
// Typesense Client
const typesense = new typesense_1.Client({
    nodes: [
        {
            host: process.env.TYPESENSE_HOST || 'localhost',
            port: parseInt(process.env.TYPESENSE_PORT || '8108'),
            protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
    ],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
    connectionTimeoutSeconds: 5,
    numRetries: 3,
    retryIntervalSeconds: 0.1,
});
// Redis
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
// Buffer Config
const BUFFER_SIZE = 50;
const BUFFER_TIMEOUT = 500;
let buffer = [];
let bufferTimer = null;
async function addToBuffer(item) {
    buffer.push(item);
    if (buffer.length >= BUFFER_SIZE) {
        await flushBuffer();
    }
    else if (!bufferTimer) {
        bufferTimer = setTimeout(flushBuffer, BUFFER_TIMEOUT);
    }
}
async function flushBuffer() {
    if (bufferTimer) {
        clearTimeout(bufferTimer);
        bufferTimer = null;
    }
    if (buffer.length === 0)
        return;
    const currentBatch = [...buffer];
    buffer = [];
    // Group by collection and action
    const batches = {};
    for (const item of currentBatch) {
        const { type, action } = item.data;
        // Default to 'upsert' if action missing
        const act = action === 'delete' ? 'delete' : 'upsert';
        const collection = `${type}@current`;
        if (!batches[collection])
            batches[collection] = {};
        if (!batches[collection][act])
            batches[collection][act] = [];
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
                let resultsArray = [];
                if (typeof results === 'string') {
                    // Typesense JS client might return a string of JSONL or array depending on version/config
                    // 1.8.2 usually returns array of objects for import()
                    try {
                        resultsArray = JSON.parse(results); // if single string
                    }
                    catch {
                        // might be JSONL lines
                        // ⚡ Bolt Optimization: Replace split.filter.map with reduce to avoid intermediate array allocations
                        resultsArray = results.split('\n').reduce((acc, l) => {
                            if (l.trim()) {
                                acc.push(JSON.parse(l));
                            }
                            return acc;
                        }, []);
                    }
                }
                else if (Array.isArray(results)) {
                    resultsArray = results;
                }
                for (let k = 0; k < items.length; k++) {
                    const item = items[k];
                    const res = resultsArray[k];
                    if (res && res.success) {
                        indexerOpsTotal.inc({ op: 'upsert', status: 'success' });
                        await redis.xack(item.streamKey, item.group, item.streamId);
                    }
                    else {
                        // Failed item
                        throw new Error(res?.error || "Unknown error");
                    }
                }
            }
            catch (error) {
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
                // ⚡ Bolt Optimization: Combine ID extraction and filtering to avoid intermediate array allocation
                const validIds = items.reduce((acc, i) => {
                    const id = i.data.id;
                    if (id)
                        acc.push(id);
                    return acc;
                }, []);
                if (validIds.length > 0) {
                    await typesense.collections(collection).documents().delete({ filter_by: `id:[${validIds.join(',')}]` });
                }
                for (const item of items) {
                    indexerOpsTotal.inc({ op: 'delete', status: 'success' });
                    await redis.xack(item.streamKey, item.group, item.streamId);
                }
            }
            catch (error) {
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
        }
        catch (e) {
            if (!e.message.includes('BUSYGROUP'))
                logger.warn(e, "Group creation warning");
        }
        logger.info("Starting queue processing...");
        while (true) {
            // Read new messages
            const results = await redis.xreadgroup('GROUP', group, consumer, 'COUNT', 50, 'BLOCK', 2000, 'STREAMS', streamKey, '>');
            if (results) {
                for (const [stream, messages] of results) {
                    for (const [id, fields] of messages) {
                        let dataStr = "";
                        for (let i = 0; i < fields.length; i += 2) {
                            if (fields[i] === 'data')
                                dataStr = fields[i + 1];
                        }
                        if (dataStr) {
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.timestamp) {
                                    indexerLag.set(Date.now() / 1000 - data.timestamp);
                                }
                                await addToBuffer({ data, streamId: id, streamKey, group });
                            }
                            catch (err) {
                                logger.error({ err, id }, "Failed to parse message");
                                await redis.xack(streamKey, group, id);
                            }
                        }
                        else {
                            await redis.xack(streamKey, group, id);
                        }
                    }
                }
            }
        }
    }
    catch (error) {
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
