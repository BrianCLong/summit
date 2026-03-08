"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
const bullmq_1 = require("bullmq");
const nats_1 = require("nats");
const csv_js_1 = require("./connectors/csv.js");
const rss_js_1 = require("./connectors/rss.js");
const misp_js_1 = require("./connectors/misp.js");
const queue_js_1 = require("./queue.js");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = __importDefault(require("crypto"));
const avsc_1 = __importDefault(require("avsc"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const connection = new ioredis_1.default({ host: REDIS_HOST, port: REDIS_PORT });
// Load Avro Schema
const schemaPaths = [
    path_1.default.resolve(process.cwd(), 'schema/ingest-event.avsc'),
    path_1.default.resolve(process.cwd(), '../../packages/ingest-connector-sdk/schema/ingest-event.avsc'),
    path_1.default.resolve(process.cwd(), '../packages/ingest-connector-sdk/schema/ingest-event.avsc')
];
let type;
let loadedSchema = false;
for (const p of schemaPaths) {
    if (fs_1.default.existsSync(p)) {
        try {
            type = avsc_1.default.Type.forSchema(JSON.parse(fs_1.default.readFileSync(p, 'utf8')));
            console.log(`Loaded Avro schema from ${p}`);
            loadedSchema = true;
            break;
        }
        catch (e) {
            console.warn(`Failed to parse schema at ${p}`, e);
        }
    }
}
if (!loadedSchema) {
    console.warn('Avro schema file not found, using embedded fallback.');
    type = avsc_1.default.Type.forSchema({
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
    throughput: {},
    lag: {},
    dlq: {},
    errors: {}
};
// Circuit Breaker Config
const CB_THRESHOLD = 10; // Max errors before opening
const CB_RESET_TIMEOUT = 30000; // 30s
const cbState = {}; // timestamp when it opens
// Log metrics periodically
setInterval(() => {
    console.log('Metrics:', JSON.stringify(metrics));
}, 60000);
const connectors = {
    'csv': new csv_js_1.CsvConnector(),
    'rss': new rss_js_1.RssConnector(),
    'misp': new misp_js_1.MispConnector()
};
function generateHash(content) {
    return crypto_1.default.createHash('sha256').update(JSON.stringify(content)).digest('hex');
}
async function isDuplicate(sourceKey, contentHash) {
    const key = `ingest:seen:${sourceKey}:${contentHash}`;
    const exists = await connection.exists(key);
    if (exists)
        return true;
    await connection.setex(key, 86400, '1');
    return false;
}
async function getCheckpoint(resourceId) {
    const key = `ingest:checkpoint:${resourceId}`;
    const data = await connection.get(key);
    return data ? JSON.parse(data) : undefined;
}
async function saveCheckpoint(resourceId, state) {
    const key = `ingest:checkpoint:${resourceId}`;
    await connection.set(key, JSON.stringify(state));
}
function checkCircuitBreaker(connectorName) {
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
function tripCircuitBreaker(connectorName) {
    metrics.errors[connectorName] = (metrics.errors[connectorName] || 0) + 1;
    if (metrics.errors[connectorName] > CB_THRESHOLD) {
        console.warn(`Circuit breaker tripped for ${connectorName}`);
        cbState[connectorName] = Date.now() + CB_RESET_TIMEOUT;
    }
}
async function start() {
    console.log('Starting Ingest Runner...');
    // Setup NATS
    let nc;
    try {
        nc = await (0, nats_1.connect)({ servers: NATS_URL });
        console.log('Connected to NATS');
    }
    catch (err) {
        console.warn('NATS connection failed:', err);
        // Note: We do NOT throw here to allow the service to start if NATS is temporarily down,
        // BUT we will enforce NATS presence in the worker loop.
    }
    // BullMQ Worker
    const worker = new bullmq_1.Worker('ingest-jobs', async (job) => {
        // CRITICAL: Ensure NATS is available before processing to prevent data loss
        if (!nc || nc.isClosed()) {
            try {
                console.log('NATS not connected, attempting reconnect...');
                nc = await (0, nats_1.connect)({ servers: NATS_URL });
                console.log('Reconnected to NATS');
            }
            catch (e) {
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
                    await (0, queue_js_1.scheduleIngest)(connectorName, res.id);
                }
                return resources;
            }
            else {
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
                        }
                        catch (err) {
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
        }
        catch (error) {
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
            await (0, queue_js_1.scheduleIngest)(name);
        }
    }
    console.log('Ingest Runner started.');
    return worker;
}
if (import.meta.url === `file://${process.argv[1]}`) {
    start().catch(console.error);
}
