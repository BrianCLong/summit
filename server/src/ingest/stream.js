"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamIngest = exports.StreamingIngestService = void 0;
// server/src/ingest/stream.ts
const kafkajs_1 = require("kafkajs");
const contracts_js_1 = require("../policy/contracts.js");
const logger_js_1 = require("../config/logger.js");
const prom_client_1 = require("prom-client");
const postgres_js_1 = require("../db/postgres.js");
// --- Metrics ---
const ingestLag = new prom_client_1.Gauge({
    name: 'ingest_kafka_consumer_lag',
    help: 'Consumer lag in offsets',
    labelNames: ['topic', 'partition']
});
const ingestErrors = new prom_client_1.Counter({
    name: 'ingest_kafka_errors_total',
    help: 'Total ingestion errors',
    labelNames: ['topic', 'type']
});
const ingestLatency = new prom_client_1.Histogram({
    name: 'ingest_e2e_latency_seconds',
    help: 'End-to-end ingestion latency',
    labelNames: ['topic']
});
// --- Configuration ---
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const GROUP_ID = 'intelgraph-ingest-v1';
const DLQ_TOPIC_SUFFIX = '-dlq';
// --- Backpressure State ---
let isBackpressureActive = false;
// --- Service ---
class StreamingIngestService {
    kafka;
    consumer;
    isRunning = false;
    producer; // Lazy init
    constructor() {
        this.kafka = new kafkajs_1.Kafka({
            clientId: 'intelgraph-ingest',
            brokers: KAFKA_BROKERS,
            logLevel: 1 // ERROR only to reduce noise
        });
        this.consumer = this.kafka.consumer({
            groupId: GROUP_ID,
            // Exactly-once support via transactional producer is handled at producer side,
            // but consumer idempotency relies on managing offsets or business logic idempotency.
            // We implement business logic idempotency.
        });
    }
    async start(topics) {
        if (this.isRunning)
            return;
        try {
            await this.consumer.connect();
            await this.consumer.subscribe({ topics, fromBeginning: false });
            this.isRunning = true;
            logger_js_1.logger.info({ topics }, 'Kafka consumer connected');
            // Start Lag Monitor
            this.startLagMonitor(topics);
            await this.consumer.run({
                eachMessage: this.handleMessage.bind(this),
                autoCommit: false, // We commit manually after processing
            });
        }
        catch (e) {
            logger_js_1.logger.error(e, 'Failed to start Kafka consumer');
            throw e;
        }
    }
    async startLagMonitor(topics) {
        const admin = this.kafka.admin();
        try {
            await admin.connect();
            const checkLag = async () => {
                if (!this.isRunning)
                    return;
                try {
                    const offsets = await admin.fetchOffsets({ groupId: GROUP_ID, topics });
                    // fetchOffsets returns Array<{ topic: string, partitions: Array<{ partition: number, offset: string, ... }> }>
                    // fetchTopicOffsets returns Array<{ partition: number, offset: string, ... }>
                    const topicOffsets = await admin.fetchTopicOffsets(topics[0]);
                    // We only care about the first topic for now as per topics[0]
                    const topicGroupOffsets = offsets.find(t => t.topic === topics[0]);
                    if (topicGroupOffsets && topicGroupOffsets.partitions) {
                        for (const p of topicGroupOffsets.partitions) {
                            const endOffset = topicOffsets.find(t => t.partition === p.partition);
                            if (endOffset) {
                                const lag = BigInt(endOffset.offset) - BigInt(p.offset);
                                ingestLag.set({ topic: topics[0], partition: p.partition }, Number(lag));
                            }
                        }
                    }
                }
                catch (e) {
                    logger_js_1.logger.warn({ err: e }, 'Failed to fetch consumer lag');
                }
                if (this.isRunning)
                    setTimeout(checkLag, 15000); // Check every 15s
            };
            checkLag();
        }
        catch (e) {
            logger_js_1.logger.error({ err: e }, 'Failed to start lag monitor');
        }
    }
    async stop() {
        this.isRunning = false;
        await this.consumer.disconnect();
        if (this.producer)
            await this.producer.disconnect();
    }
    async handleMessage({ topic, partition, message, heartbeat, pause }) {
        const start = Date.now();
        // Backpressure check (Simulated: check DB pool health or memory)
        if (this.shouldBackpressure()) {
            logger_js_1.logger.warn({ topic, partition }, 'Backpressure active, pausing consumer');
            pause();
            setTimeout(() => this.consumer.resume([{ topic }]), 5000); // Resume after 5s
            return;
        }
        try {
            if (!message.value)
                return;
            const payloadStr = message.value.toString();
            const payload = JSON.parse(payloadStr);
            // 1. Metric: Lag
            // High-water mark is not directly exposed in eachMessage,
            // but we can approximate or use admin client.
            // Here we skip exact lag calc per message for perf.
            // 2. Schema & Contract Gate
            // payload expected format: { schemaId, data, tenantId, idempotentKey }
            if (!payload.schemaId || !payload.data) {
                throw new Error('Missing schemaId or data in payload');
            }
            await (0, contracts_js_1.applyContract)(payload.schemaId, payload.data, payload.tenantId);
            // 3. Idempotent Upsert
            await this.upsertRecord(payload);
            // 4. Commit Offset
            await this.consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
            await heartbeat();
            // 5. Metric: Latency
            ingestLatency.observe({ topic }, (Date.now() - start) / 1000);
        }
        catch (error) {
            logger_js_1.logger.error({ err: error, topic, offset: message.offset }, 'Message processing failed');
            ingestErrors.inc({ topic, type: error.name || 'Unknown' });
            // Send to DLQ
            await this.sendToDLQ(topic, message, error);
            // We commit the offset so we don't block forever on a bad message
            // (At-least-once semantics with DLQ fallback)
            await this.consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
        }
    }
    async upsertRecord(payload) {
        // Idempotent write to DB using a unique key
        const pool = (0, postgres_js_1.getPostgresPool)();
        const key = payload.idempotentKey || payload.data.id;
        if (!key) {
            throw new Error('Missing idempotentKey or data.id. Exactly-once semantics require a unique ID.');
        }
        const tenantId = payload.tenantId || 'default'; // Fallback for MVP
        // Using a generic 'ingested_events' table for this example.
        // In reality this would map to domain tables based on schema.
        // First ensure table exists (Migration would handle this in real life)
        // We'll skip creating table in runtime code, assuming it exists or using a generic JSON store.
        // Simulating the upsert into a hypothetical 'ingest_log'
        // ON CONFLICT DO NOTHING implies idempotency.
        // Note: We need a table. Let's assume one exists or we just log for the scaffold if no DB migration yet.
        // But the prompt says "idempotent writes".
        await pool.query(`INSERT INTO ingest_events (id, tenant_id, schema_id, data, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id) DO NOTHING`, [key, tenantId, payload.schemaId, payload.data]);
    }
    async sendToDLQ(originalTopic, message, error) {
        if (!this.producer) {
            this.producer = this.kafka.producer();
            await this.producer.connect();
        }
        const dlqTopic = `${originalTopic}${DLQ_TOPIC_SUFFIX}`;
        await this.producer.send({
            topic: dlqTopic,
            messages: [{
                    key: message.key,
                    value: JSON.stringify({
                        original: message.value?.toString(),
                        error: error.message,
                        stack: error.stack,
                        timestamp: new Date().toISOString()
                    })
                }]
        });
    }
    shouldBackpressure() {
        // Simple heuristic: Heap usage
        const memory = process.memoryUsage();
        const heapUsedPct = memory.heapUsed / memory.heapTotal;
        return heapUsedPct > 0.85;
    }
}
exports.StreamingIngestService = StreamingIngestService;
exports.streamIngest = new StreamingIngestService();
