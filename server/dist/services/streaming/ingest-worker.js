/**
 * IntelGraph GA-Core Streaming Ingest Worker
 * Committee Requirements: PII redaction, real-time processing, observability
 * Stribol: "PII redaction worker; OTEL/Prom scaffolding; SLO dashboards"
 */
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { insertEvent } from '../../db/timescale.js';
import { insertAnalyticsTrace } from '../../db/timescale.js';
import ProvenanceLedgerService from '../provenance-ledger.js';
import logger from '../../utils/logger.js';
export class StreamingIngestWorker extends EventEmitter {
    static getInstance() {
        if (!StreamingIngestWorker.instance) {
            StreamingIngestWorker.instance = new StreamingIngestWorker();
        }
        return StreamingIngestWorker.instance;
    }
    constructor() {
        super();
        this.messageQueue = [];
        this.processing = false;
        this.batchSize = 100;
        this.batchTimeout = 5000; // 5 seconds
        this.provenanceService = ProvenanceLedgerService.getInstance();
        this.initializeMetrics();
        this.initializePIIRedaction();
        this.startBatchProcessor();
    }
    initializeMetrics() {
        this.metrics = {
            messages_processed: 0,
            messages_per_second: 0,
            average_processing_time_ms: 0,
            pii_redactions_applied: 0,
            errors_encountered: 0,
            queue_size: 0,
            worker_status: 'healthy',
        };
        // Update metrics every 10 seconds
        setInterval(() => {
            this.updateMetrics();
        }, 10000);
    }
    // Committee requirement: PII redaction configuration
    initializePIIRedaction() {
        this.piiConfig = {
            enabled: process.env.PII_REDACTION_ENABLED !== 'false',
            replacement_token: '[REDACTED]',
            log_redactions: process.env.LOG_PII_REDACTIONS === 'true',
            redaction_patterns: {
                ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
                email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                phone: /\b\d{3}-\d{3}-\d{4}\b|\(\d{3}\)\s*\d{3}-\d{4}/g,
                credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
                ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
                passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
                license_plate: /\b[A-Z]{2,3}[-\s]?\d{3,4}[-\s]?[A-Z]?\b/g,
                bank_account: /\b\d{8,17}\b/g,
                coordinates: /\b-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/g,
                api_key: /\b[A-Za-z0-9]{32,}\b/g,
            },
        };
    }
    // Main ingest endpoint
    async ingestMessage(message) {
        const messageId = crypto.randomUUID();
        const fullMessage = {
            message_id: messageId,
            ...message,
        };
        // Add to queue
        this.messageQueue.push(fullMessage);
        this.metrics.queue_size = this.messageQueue.length;
        // Emit queue size alert if getting too large
        if (this.messageQueue.length > 1000) {
            this.emit('queue_alert', {
                queue_size: this.messageQueue.length,
                severity: 'HIGH',
            });
        }
        logger.debug({
            message: 'Message added to ingest queue',
            message_id: messageId,
            source: message.source,
            queue_size: this.messageQueue.length,
        });
        return messageId;
    }
    // Batch processor for efficient handling
    startBatchProcessor() {
        setInterval(async () => {
            if (!this.processing && this.messageQueue.length > 0) {
                await this.processBatch();
            }
        }, this.batchTimeout);
    }
    async processBatch() {
        if (this.processing || this.messageQueue.length === 0) {
            return;
        }
        this.processing = true;
        const batchStartTime = Date.now();
        try {
            // Take batch from queue
            const batch = this.messageQueue.splice(0, Math.min(this.batchSize, this.messageQueue.length));
            this.metrics.queue_size = this.messageQueue.length;
            logger.info({
                message: 'Processing ingest batch',
                batch_size: batch.length,
                remaining_queue: this.messageQueue.length,
            });
            // Process batch in parallel
            const processedMessages = await Promise.allSettled(batch.map((message) => this.processMessage(message)));
            // Handle results
            let successCount = 0;
            let errorCount = 0;
            for (let i = 0; i < processedMessages.length; i++) {
                const result = processedMessages[i];
                if (result.status === 'fulfilled') {
                    successCount++;
                    await this.handleProcessedMessage(result.value);
                }
                else {
                    errorCount++;
                    this.metrics.errors_encountered++;
                    logger.error({
                        message: 'Message processing failed in batch',
                        message_id: batch[i].message_id,
                        error: result.reason,
                        batch_index: i,
                    });
                    // Emit error event
                    this.emit('processing_error', {
                        message_id: batch[i].message_id,
                        error: result.reason,
                    });
                }
            }
            const batchProcessingTime = Date.now() - batchStartTime;
            this.metrics.messages_processed += successCount;
            logger.info({
                message: 'Batch processing completed',
                batch_size: batch.length,
                successful: successCount,
                errors: errorCount,
                processing_time_ms: batchProcessingTime,
                messages_per_second: Math.round((batch.length / batchProcessingTime) * 1000),
            });
            // Update worker status
            this.updateWorkerStatus(errorCount, batch.length);
        }
        catch (error) {
            logger.error({
                message: 'Batch processing failed',
                error: error instanceof Error ? error.message : String(error),
            });
            this.metrics.worker_status = 'unhealthy';
            this.emit('worker_error', error);
        }
        finally {
            this.processing = false;
        }
    }
    // Individual message processing
    async processMessage(message) {
        const processingStartTime = Date.now();
        const traceId = crypto.randomUUID();
        try {
            // Step 1: PII redaction (Committee requirement)
            const redactionResult = await this.applyPIIRedaction(message.raw_data);
            // Step 2: Data validation and normalization
            const normalizedData = await this.normalizeData(redactionResult.processed_data, message.data_type);
            // Step 3: Confidence scoring
            const confidence = this.calculateConfidence(normalizedData, message);
            const processingTime = Date.now() - processingStartTime;
            const processedMessage = {
                message_id: message.message_id,
                source: message.source,
                timestamp: message.timestamp,
                data_type: message.data_type,
                processed_data: normalizedData,
                redaction_applied: redactionResult.redaction_applied,
                pii_fields_removed: redactionResult.pii_fields_removed,
                processing_time_ms: processingTime,
                confidence,
                metadata: {
                    ...message.metadata,
                    processing_trace_id: traceId,
                    correlation_id: message.correlation_id,
                    priority: message.priority,
                },
            };
            // Committee requirement: Analytics tracing
            await insertAnalyticsTrace({
                trace_id: traceId,
                operation_type: 'streaming_ingest_processing',
                duration_ms: processingTime,
                input_hash: this.hashMessage(message),
                output_hash: this.hashMessage(processedMessage),
                performance_metrics: {
                    pii_redaction_applied: redactionResult.redaction_applied,
                    confidence_score: confidence,
                    data_type: message.data_type,
                    source: message.source,
                },
            });
            return processedMessage;
        }
        catch (error) {
            logger.error({
                message: 'Individual message processing failed',
                message_id: message.message_id,
                error: error instanceof Error ? error.message : String(error),
                trace_id: traceId,
            });
            throw error;
        }
    }
    // Committee requirement: PII redaction implementation
    async applyPIIRedaction(data) {
        if (!this.piiConfig.enabled) {
            return {
                processed_data: data,
                redaction_applied: false,
                pii_fields_removed: [],
            };
        }
        const piiFieldsRemoved = [];
        let redactionApplied = false;
        const processObject = (obj, path = '') => {
            if (typeof obj === 'string') {
                let processedString = obj;
                for (const [patternName, pattern] of Object.entries(this.piiConfig.redaction_patterns)) {
                    if (pattern.test(processedString)) {
                        processedString = processedString.replace(pattern, this.piiConfig.replacement_token);
                        piiFieldsRemoved.push(`${path}.${patternName}`);
                        redactionApplied = true;
                    }
                }
                return processedString;
            }
            if (Array.isArray(obj)) {
                return obj.map((item, index) => processObject(item, `${path}[${index}]`));
            }
            if (obj && typeof obj === 'object') {
                const processed = {};
                for (const [key, value] of Object.entries(obj)) {
                    processed[key] = processObject(value, path ? `${path}.${key}` : key);
                }
                return processed;
            }
            return obj;
        };
        const processedData = processObject(data);
        if (redactionApplied && this.piiConfig.log_redactions) {
            logger.info({
                message: 'PII redaction applied',
                fields_redacted: piiFieldsRemoved.length,
                patterns_matched: [...new Set(piiFieldsRemoved.map((f) => f.split('.').pop()))],
            });
            this.metrics.pii_redactions_applied++;
        }
        return {
            processed_data: processedData,
            redaction_applied: redactionApplied,
            pii_fields_removed: piiFieldsRemoved,
        };
    }
    // Data normalization
    async normalizeData(data, dataType) {
        switch (dataType) {
            case 'event':
                return this.normalizeEventData(data);
            case 'entity':
                return this.normalizeEntityData(data);
            case 'relationship':
                return this.normalizeRelationshipData(data);
            case 'document':
                return this.normalizeDocumentData(data);
            default:
                return data;
        }
    }
    normalizeEventData(data) {
        return {
            event_id: data.id || crypto.randomUUID(),
            event_type: data.type || 'unknown',
            timestamp: new Date(data.timestamp || Date.now()),
            source: data.source || 'unknown',
            severity: data.severity || 'INFO',
            description: data.description || '',
            metadata: data.metadata || {},
        };
    }
    normalizeEntityData(data) {
        return {
            entity_id: data.id || crypto.randomUUID(),
            entity_type: data.type || 'unknown',
            properties: data.properties || {},
            confidence: Math.min(Math.max(data.confidence || 0.5, 0), 1),
            source: data.source || 'unknown',
            created_at: new Date(data.created_at || Date.now()),
        };
    }
    normalizeRelationshipData(data) {
        return {
            relationship_id: data.id || crypto.randomUUID(),
            source_entity: data.source || data.from,
            target_entity: data.target || data.to,
            relationship_type: data.type || 'unknown',
            properties: data.properties || {},
            confidence: Math.min(Math.max(data.confidence || 0.5, 0), 1),
            created_at: new Date(data.created_at || Date.now()),
        };
    }
    normalizeDocumentData(data) {
        return {
            document_id: data.id || crypto.randomUUID(),
            title: data.title || 'Untitled',
            content: data.content || '',
            document_type: data.type || 'unknown',
            metadata: data.metadata || {},
            source: data.source || 'unknown',
            processed_at: new Date(),
        };
    }
    // Confidence calculation
    calculateConfidence(data, originalMessage) {
        let confidence = 0.5; // Base confidence
        // Source reliability
        const sourceReliability = this.getSourceReliability(originalMessage.source);
        confidence += sourceReliability * 0.3;
        // Data completeness
        const completeness = this.calculateDataCompleteness(data);
        confidence += completeness * 0.2;
        // Priority boost
        if (originalMessage.priority > 5) {
            confidence += 0.1;
        }
        return Math.min(Math.max(confidence, 0.1), 1.0);
    }
    getSourceReliability(source) {
        const reliabilityMap = {
            official_feed: 0.9,
            verified_api: 0.8,
            internal_system: 0.7,
            third_party_api: 0.6,
            user_input: 0.4,
            unknown: 0.3,
        };
        return reliabilityMap[source] || 0.3;
    }
    calculateDataCompleteness(data) {
        if (!data || typeof data !== 'object') {
            return 0.2;
        }
        const fields = Object.keys(data);
        const nonEmptyFields = fields.filter((field) => {
            const value = data[field];
            return value !== null && value !== undefined && value !== '';
        });
        return nonEmptyFields.length / Math.max(fields.length, 1);
    }
    // Handle processed messages
    async handleProcessedMessage(processed) {
        try {
            // Store as TimescaleDB event
            await insertEvent({
                event_type: 'INGESTED_DATA',
                event_source: processed.source,
                entity_id: processed.message_id,
                entity_type: processed.data_type,
                metadata: {
                    processed_message: processed,
                    pii_redaction_applied: processed.redaction_applied,
                    processing_time_ms: processed.processing_time_ms,
                },
                confidence: processed.confidence,
                severity: processed.processing_time_ms > 1000 ? 'WARNING' : 'INFO',
            });
            // Create provenance record
            await this.provenanceService.recordProvenanceEntry({
                operation_type: 'STREAMING_INGEST',
                actor_id: 'streaming-worker',
                metadata: {
                    message_id: processed.message_id,
                    source: processed.source,
                    data_type: processed.data_type,
                    processing_time_ms: processed.processing_time_ms,
                    pii_redaction: processed.redaction_applied,
                },
            });
            // Emit success event
            this.emit('message_processed', processed);
        }
        catch (error) {
            logger.error({
                message: 'Failed to handle processed message',
                message_id: processed.message_id,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    // Utility methods
    hashMessage(message) {
        const normalized = {
            id: message.message_id,
            source: message.source,
            data_type: message.data_type,
            timestamp: message.timestamp,
        };
        return crypto.createHash('md5').update(JSON.stringify(normalized)).digest('hex');
    }
    updateMetrics() {
        // Update messages per second
        const now = Date.now();
        if (this.metrics.messages_processed > 0) {
            // Simplified calculation - would maintain time windows for accuracy
            this.metrics.messages_per_second = Math.round(this.metrics.messages_processed / 60);
        }
        this.metrics.queue_size = this.messageQueue.length;
        // Update worker status
        if (this.metrics.errors_encountered > 10) {
            this.metrics.worker_status = 'unhealthy';
        }
        else if (this.metrics.errors_encountered > 5 || this.metrics.queue_size > 500) {
            this.metrics.worker_status = 'degraded';
        }
        else {
            this.metrics.worker_status = 'healthy';
        }
    }
    updateWorkerStatus(errorCount, batchSize) {
        const errorRate = errorCount / batchSize;
        if (errorRate > 0.2) {
            this.metrics.worker_status = 'unhealthy';
        }
        else if (errorRate > 0.1 || this.messageQueue.length > 500) {
            this.metrics.worker_status = 'degraded';
        }
        else {
            this.metrics.worker_status = 'healthy';
        }
    }
    // Public API methods
    getMetrics() {
        return { ...this.metrics };
    }
    getQueueSize() {
        return this.messageQueue.length;
    }
    clearQueue() {
        const queueSize = this.messageQueue.length;
        this.messageQueue = [];
        this.metrics.queue_size = 0;
        logger.info({
            message: 'Ingest queue cleared',
            messages_cleared: queueSize,
        });
        this.emit('queue_cleared', { messages_cleared: queueSize });
    }
    // Graceful shutdown
    async shutdown() {
        logger.info({
            message: 'Streaming ingest worker shutting down',
            pending_messages: this.messageQueue.length,
        });
        // Process remaining messages
        while (this.messageQueue.length > 0 && !this.processing) {
            await this.processBatch();
        }
        this.removeAllListeners();
        logger.info({ message: 'Streaming ingest worker shutdown complete' });
    }
}
export default StreamingIngestWorker;
//# sourceMappingURL=ingest-worker.js.map