// server/src/ingest/stream.ts
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { applyContract } from '../policy/contracts.js';
import { logger } from '../config/logger.js';
import { Counter, Gauge, Histogram } from 'prom-client';
import { getPostgresPool } from '../db/postgres.js';
import { randomUUID } from 'crypto';

// --- Metrics ---

const ingestLag = new Gauge({
    name: 'ingest_kafka_consumer_lag',
    help: 'Consumer lag in offsets',
    labelNames: ['topic', 'partition']
});

const ingestErrors = new Counter({
    name: 'ingest_kafka_errors_total',
    help: 'Total ingestion errors',
    labelNames: ['topic', 'type']
});

const ingestLatency = new Histogram({
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

export class StreamingIngestService {
    private kafka: Kafka;
    private consumer: Consumer;
    private isRunning: boolean = false;
    private producer: any; // Lazy init

    constructor() {
        this.kafka = new Kafka({
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

    async start(topics: string[]) {
        if (this.isRunning) return;

        try {
            await this.consumer.connect();
            await this.consumer.subscribe({ topics, fromBeginning: false });

            this.isRunning = true;
            logger.info({ topics }, 'Kafka consumer connected');

            // Start Lag Monitor
            this.startLagMonitor(topics);

            await this.consumer.run({
                eachMessage: this.handleMessage.bind(this),
                autoCommit: false, // We commit manually after processing
            });
        } catch (e: any) {
            logger.error(e, 'Failed to start Kafka consumer');
            throw e;
        }
    }

    private async startLagMonitor(topics: string[]) {
        const admin = this.kafka.admin();
        try {
            await admin.connect();

            const checkLag = async () => {
                if (!this.isRunning) return;

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
                } catch (e: any) {
                    logger.warn({ err: e }, 'Failed to fetch consumer lag');
                }

                if (this.isRunning) setTimeout(checkLag, 15000); // Check every 15s
            };

            checkLag();
        } catch (e: any) {
            logger.error({ err: e }, 'Failed to start lag monitor');
        }
    }

    async stop() {
        this.isRunning = false;
        await this.consumer.disconnect();
        if (this.producer) await this.producer.disconnect();
    }

    private async handleMessage({ topic, partition, message, heartbeat, pause }: EachMessagePayload) {
        const start = Date.now();

        // Backpressure check (Simulated: check DB pool health or memory)
        if (this.shouldBackpressure()) {
            logger.warn({ topic, partition }, 'Backpressure active, pausing consumer');
            pause();
            setTimeout(() => this.consumer.resume([{ topic }]), 5000); // Resume after 5s
            return;
        }

        try {
            if (!message.value) return;

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

            await applyContract(payload.schemaId, payload.data, payload.tenantId);

            // 3. Idempotent Upsert
            await this.upsertRecord(payload);

            // 4. Commit Offset
            await this.consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
            await heartbeat();

            // 5. Metric: Latency
            ingestLatency.observe({ topic }, (Date.now() - start) / 1000);

        } catch (error: any) {
            logger.error({ err: error, topic, offset: message.offset }, 'Message processing failed');
            ingestErrors.inc({ topic, type: error.name || 'Unknown' });

            // Send to DLQ
            await this.sendToDLQ(topic, message, error);

            // We commit the offset so we don't block forever on a bad message
            // (At-least-once semantics with DLQ fallback)
            await this.consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
        }
    }

    private async upsertRecord(payload: any) {
        // Idempotent write to DB using a unique key
        const pool = getPostgresPool();
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

        await pool.query(
            `INSERT INTO ingest_events (id, tenant_id, schema_id, data, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [key, tenantId, payload.schemaId, payload.data]
        );
    }

    private async sendToDLQ(originalTopic: string, message: any, error: Error) {
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

    private shouldBackpressure(): boolean {
        // Simple heuristic: Heap usage
        const memory = process.memoryUsage();
        const heapUsedPct = memory.heapUsed / memory.heapTotal;
        return heapUsedPct > 0.85;
    }
}

export const streamIngest = new StreamingIngestService();
