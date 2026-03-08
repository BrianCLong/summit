"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamingIngestionService = exports.StreamingIngestionService = void 0;
// @ts-nocheck
const bullmq_1 = require("bullmq");
const OsintConnector_js_1 = require("../connectors/implementations/OsintConnector.js");
const ledger_js_1 = require("../provenance/ledger.js");
const provenance_1 = require("@intelgraph/provenance");
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const prom_client_1 = require("prom-client");
const logger = pino_1.default({ name: 'StreamingIngestionService' });
// Metrics
const recordsIngested = new prom_client_1.Counter({
    name: 'osint_ingestion_records_total',
    help: 'Total number of OSINT records ingested',
    labelNames: ['source_type', 'status']
});
const ingestionLatency = new prom_client_1.Histogram({
    name: 'osint_ingestion_latency_seconds',
    help: 'Latency of ingestion processing',
    labelNames: ['source_type']
});
class StreamingIngestionService {
    queue;
    worker;
    connectors = new Map();
    redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    };
    constructor() {
        this.queue = new bullmq_1.Queue('osint-ingestion', { connection: this.redisConfig });
        // Initialize worker
        this.worker = new bullmq_1.Worker('osint-ingestion', async (job) => {
            const start = Date.now();
            try {
                await this.processRecord(job.data);
                recordsIngested.inc({ source_type: job.data.record.sourceType, status: 'success' });
            }
            catch (error) {
                logger.error({ error, jobId: job.id }, 'Ingestion job failed');
                recordsIngested.inc({ source_type: job.data.record.sourceType, status: 'failure' });
                throw error;
            }
            finally {
                ingestionLatency.observe({ source_type: job.data.record.sourceType }, (Date.now() - start) / 1000);
            }
        }, {
            connection: this.redisConfig,
            concurrency: 50 // High concurrency for throughput
        });
        this.worker.on('failed', (job, err) => {
            logger.error({ jobId: job?.id, err }, 'Job failed');
        });
    }
    // Register a source to poll/stream from
    async registerSource(id, type, tenantId) {
        const connector = new OsintConnector_js_1.OsintConnector({
            id,
            name: `osint-${type}-${id}`,
            type: 'osint',
            tenantId,
            sourceType: type,
            config: {}
        }, logger);
        this.connectors.set(id, connector);
        // Start streaming (simulated)
        this.startStreaming(id, connector, tenantId);
    }
    async startStreaming(sourceId, connector, tenantId) {
        try {
            const stream = await connector.fetchStream();
            for await (const record of stream) {
                await this.queue.add('ingest', { record, tenantId }, {
                    removeOnComplete: true,
                    removeOnFail: false // Keep failed for DLQ inspection
                });
            }
        }
        catch (error) {
            logger.error({ error, sourceId }, 'Streaming failed, restarting in 5s');
            setTimeout(() => this.startStreaming(sourceId, connector, tenantId), 5000);
        }
    }
    async processRecord(data) {
        const { record, tenantId } = data;
        // 1. Validation (Schema Check)
        if (!record.content || !record.timestamp) {
            throw new Error('Invalid record schema');
        }
        // 2. Deduplication (simulated via Redis check or Bloom filter in real impl)
        // For now, assume unique based on ID
        // 3. Enrichment (e.g. NLP, Sentiment - mocked here)
        const enrichedRecord = {
            ...record,
            metadata: {
                ...record.metadata,
                processedAt: new Date(),
                riskScore: Math.random() // Simulated ML score
            }
        };
        // 4. Lineage Tracking
        const lineageId = (0, crypto_1.randomUUID)();
        const event = {
            id: (0, crypto_1.randomUUID)(),
            sourceId: record.id,
            timestamp: new Date(),
            data: enrichedRecord,
            metadata: {
                tenantId,
                ingestionType: 'stream'
            },
            provenance: {
                source: record.sourceType,
                sourceId: record.id,
                ingestTimestamp: new Date(),
                connectorType: 'osint',
                lineageId
            }
        };
        // Generate Sovereign OPA Input if applicable
        const isSovereign = enrichedRecord.metadata?.isSovereign || false;
        let sovereignSafeguards = null;
        if (isSovereign) {
            sovereignSafeguards = provenance_1.ProvenanceMapping.toSovereignInput({
                actor: { id: 'system-ingestion', role: 'admin' },
            }, enrichedRecord.metadata);
        }
        // Record to Provenance Ledger
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId,
            actionType: 'INGEST',
            resourceType: 'OsintRecord',
            resourceId: record.id,
            actorId: 'system-ingestion',
            actorType: 'system',
            payload: {
                mutationType: 'CREATE',
                diff: enrichedRecord
            },
            metadata: {
                lineageId,
                processingNode: 'ingestion-worker-1',
                isSovereign,
                sovereignSafeguards // Ingested records now carry Sovereign mandates
            }
        });
        // 5. Load (to DB - mocked log)
        logger.info({ id: record.id, type: record.sourceType }, 'Record ingested and persisted');
    }
}
exports.StreamingIngestionService = StreamingIngestionService;
exports.streamingIngestionService = new StreamingIngestionService();
