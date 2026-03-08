"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startKafkaConsumer = startKafkaConsumer;
exports.getKafkaConsumerStatus = getKafkaConsumerStatus;
exports.isKafkaConsumerHealthy = isKafkaConsumerHealthy;
const kafkajs_1 = require("kafkajs");
const uuid_1 = require("uuid");
const joi_1 = __importDefault(require("joi"));
const signalService_js_1 = require("../services/signalService.js");
const logger_js_1 = require("../observability/logger.js");
const metrics_js_1 = require("../observability/metrics.js");
const environment_js_1 = require("../../config/environment.js");
// Signal schema for Kafka messages
const kafkaSignalSchema = joi_1.default.object({
    tenantId: joi_1.default.string().required().max(255),
    type: joi_1.default.string().required().max(100),
    value: joi_1.default.number().required().min(-1000).max(1000),
    weight: joi_1.default.number().optional().min(0).max(100).default(1.0),
    source: joi_1.default.string().required().max(255),
    ts: joi_1.default.date()
        .iso()
        .optional()
        .default(() => new Date()),
    metadata: joi_1.default.object().optional(),
    messageId: joi_1.default.string().optional(),
    partition: joi_1.default.number().optional(),
    offset: joi_1.default.string().optional(),
});
class KafkaSignalConsumer {
    kafka;
    consumer;
    isRunning = false;
    processingCount = 0;
    lastCommittedOffsets = new Map();
    constructor() {
        if (!environment_js_1.config.KAFKA_BROKERS) {
            throw new Error('KAFKA_BROKERS not configured');
        }
        this.kafka = new kafkajs_1.Kafka({
            clientId: `${environment_js_1.config.OTEL_SERVICE_NAME}-consumer`,
            brokers: environment_js_1.config.KAFKA_BROKERS.split(','),
            retry: {
                initialRetryTime: 300,
                retries: 5,
                maxRetryTime: 30000,
                factor: 2,
            },
            connectionTimeout: 10000,
            requestTimeout: 30000,
        });
        this.consumer = this.kafka.consumer({
            groupId: environment_js_1.config.KAFKA_GROUP_ID,
            sessionTimeout: 30000,
            rebalanceTimeout: 60000,
            heartbeatInterval: 3000,
            maxBytesPerPartition: 1048576, // 1MB
            minBytes: 1,
            maxBytes: 10485760, // 10MB
            maxWaitTimeInMs: 5000,
            retry: {
                initialRetryTime: 100,
                retries: 3,
                maxRetryTime: 30000,
                factor: 2,
            },
        });
        // Setup error handlers
        this.consumer.on('consumer.crash', (error) => {
            logger_js_1.logger.error('Kafka consumer crashed', {
                error: error.payload.error.message,
                stack: error.payload.error.stack,
                groupId: environment_js_1.config.KAFKA_GROUP_ID,
            });
            (0, metrics_js_1.incrementCounter)('kafka_consumer_crashes_total', {
                group_id: environment_js_1.config.KAFKA_GROUP_ID,
                error_type: error.payload.error.name,
            });
            // Attempt to restart after a delay
            setTimeout(() => this.reconnect(), 5000);
        });
        this.consumer.on('consumer.disconnect', () => {
            logger_js_1.logger.warn('Kafka consumer disconnected', {
                groupId: environment_js_1.config.KAFKA_GROUP_ID,
            });
            (0, metrics_js_1.incrementCounter)('kafka_consumer_disconnects_total', {
                group_id: environment_js_1.config.KAFKA_GROUP_ID,
            });
        });
        this.consumer.on('consumer.connect', () => {
            logger_js_1.logger.info('Kafka consumer connected', {
                groupId: environment_js_1.config.KAFKA_GROUP_ID,
                topic: environment_js_1.config.KAFKA_TOPIC_COHERENCE,
            });
            (0, metrics_js_1.incrementCounter)('kafka_consumer_connects_total', {
                group_id: environment_js_1.config.KAFKA_GROUP_ID,
            });
        });
    }
    async start() {
        if (this.isRunning) {
            logger_js_1.logger.warn('Kafka consumer already running');
            return;
        }
        try {
            logger_js_1.logger.info('Starting Kafka signal consumer', {
                groupId: environment_js_1.config.KAFKA_GROUP_ID,
                topic: environment_js_1.config.KAFKA_TOPIC_COHERENCE,
                brokers: environment_js_1.config.KAFKA_BROKERS,
            });
            await this.consumer.connect();
            await this.consumer.subscribe({
                topic: environment_js_1.config.KAFKA_TOPIC_COHERENCE,
                fromBeginning: false,
            });
            await this.consumer.run({
                partitionsConsumedConcurrently: 3,
                eachMessage: this.processMessage.bind(this),
            });
            this.isRunning = true;
            logger_js_1.logger.info('Kafka signal consumer started successfully', {
                groupId: environment_js_1.config.KAFKA_GROUP_ID,
                topic: environment_js_1.config.KAFKA_TOPIC_COHERENCE,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to start Kafka consumer', {
                error: error.message,
                stack: error.stack,
                groupId: environment_js_1.config.KAFKA_GROUP_ID,
            });
            (0, metrics_js_1.incrementCounter)('kafka_consumer_start_errors_total', {
                group_id: environment_js_1.config.KAFKA_GROUP_ID,
                error_type: error.name,
            });
            throw error;
        }
    }
    async processMessage(payload) {
        const { topic, partition, message, heartbeat } = payload;
        const startTime = Date.now();
        const messageId = message.key?.toString() || (0, uuid_1.v4)();
        this.processingCount++;
        try {
            // Parse message
            let signalData;
            try {
                signalData = JSON.parse(message.value?.toString() || '{}');
            }
            catch (parseError) {
                logger_js_1.logger.error('Failed to parse Kafka message', {
                    messageId,
                    topic,
                    partition,
                    offset: message.offset,
                    error: parseError.message,
                });
                (0, metrics_js_1.incrementCounter)('kafka_message_parse_errors_total', {
                    topic,
                    partition: partition.toString(),
                    error_type: 'json_parse',
                });
                return; // Skip invalid JSON messages
            }
            // Add Kafka metadata to signal
            const enrichedSignal = {
                ...signalData,
                messageId,
                partition,
                offset: message.offset,
                kafkaTimestamp: message.timestamp,
            };
            // Validate signal
            const { error, value: validatedSignal } = kafkaSignalSchema.validate(enrichedSignal);
            if (error) {
                logger_js_1.logger.error('Kafka signal validation failed', {
                    messageId,
                    topic,
                    partition,
                    offset: message.offset,
                    validationErrors: error.details.map((d) => d.message),
                    signalData: enrichedSignal,
                });
                (0, metrics_js_1.incrementCounter)('kafka_signal_validation_errors_total', {
                    topic,
                    partition: partition.toString(),
                    tenant_id: enrichedSignal.tenantId || 'unknown',
                });
                return; // Skip invalid signals
            }
            // Create provenance record
            const provenance = {
                id: (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                source: 'kafka-consumer',
                messageId,
                topic,
                partition,
                offset: message.offset,
                purpose: 'benchmarking',
                retention: 'standard-365d',
                license: 'Restricted-TOS',
                residency: 'US',
            };
            // Attach provenance to signal
            const signalWithProvenance = {
                ...validatedSignal,
                provenance,
            };
            // Send heartbeat to maintain session
            await heartbeat();
            // Process signal with idempotency
            const result = await signalService_js_1.signalService.ingestSignalIdempotent(signalWithProvenance);
            // Record success metrics
            const processingDuration = Date.now() - startTime;
            (0, metrics_js_1.incrementCounter)('kafka_signals_processed_total', {
                topic,
                partition: partition.toString(),
                tenant_id: validatedSignal.tenantId,
                signal_type: validatedSignal.type,
                source: validatedSignal.source,
                result: result.wasProcessed ? 'processed' : 'deduplicated',
            });
            (0, metrics_js_1.recordHistogram)('kafka_signal_processing_duration_seconds', processingDuration / 1000, {
                topic,
                partition: partition.toString(),
                tenant_id: validatedSignal.tenantId,
            });
            // Track offset for monitoring
            const partitionKey = `${topic}-${partition}`;
            this.lastCommittedOffsets.set(partitionKey, message.offset);
            logger_js_1.logger.debug('Kafka signal processed successfully', {
                messageId,
                topic,
                partition,
                offset: message.offset,
                tenantId: validatedSignal.tenantId,
                signalType: validatedSignal.type,
                signalId: result.signalId,
                wasProcessed: result.wasProcessed,
                provenanceId: provenance.id,
                duration: processingDuration,
            });
        }
        catch (error) {
            const processingDuration = Date.now() - startTime;
            (0, metrics_js_1.incrementCounter)('kafka_signal_processing_errors_total', {
                topic,
                partition: partition.toString(),
                error_type: error.name || 'unknown',
            });
            (0, metrics_js_1.recordHistogram)('kafka_signal_error_duration_seconds', processingDuration / 1000, {
                topic,
                partition: partition.toString(),
                error_type: error.name || 'unknown',
            });
            logger_js_1.logger.error('Failed to process Kafka signal', {
                messageId,
                topic,
                partition,
                offset: message.offset,
                error: error.message,
                stack: error.stack,
                duration: processingDuration,
            });
            // For now, we continue processing (at-least-once delivery)
            // In production, you might want to send to a DLQ after retries
        }
        finally {
            this.processingCount--;
            // Send periodic heartbeat during long processing
            if (this.processingCount % 100 === 0) {
                await heartbeat();
            }
        }
    }
    async reconnect() {
        if (this.isRunning) {
            logger_js_1.logger.info('Attempting to reconnect Kafka consumer', {
                groupId: environment_js_1.config.KAFKA_GROUP_ID,
            });
            try {
                await this.stop();
                await new Promise((resolve) => setTimeout(resolve, 2000)); // Brief pause
                await this.start();
                logger_js_1.logger.info('Kafka consumer reconnected successfully', {
                    groupId: environment_js_1.config.KAFKA_GROUP_ID,
                });
            }
            catch (error) {
                logger_js_1.logger.error('Failed to reconnect Kafka consumer', {
                    error: error.message,
                    groupId: environment_js_1.config.KAFKA_GROUP_ID,
                });
                // Retry after longer delay
                setTimeout(() => this.reconnect(), 10000);
            }
        }
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        logger_js_1.logger.info('Stopping Kafka signal consumer', {
            groupId: environment_js_1.config.KAFKA_GROUP_ID,
            processingCount: this.processingCount,
        });
        try {
            // Wait for in-flight messages to complete (with timeout)
            const maxWaitTime = 30000; // 30 seconds
            const waitStart = Date.now();
            while (this.processingCount > 0 && Date.now() - waitStart < maxWaitTime) {
                logger_js_1.logger.info('Waiting for in-flight messages to complete', {
                    processingCount: this.processingCount,
                    waitTime: Date.now() - waitStart,
                });
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            await this.consumer.disconnect();
            this.isRunning = false;
            logger_js_1.logger.info('Kafka signal consumer stopped', {
                groupId: environment_js_1.config.KAFKA_GROUP_ID,
                lastOffsets: Object.fromEntries(this.lastCommittedOffsets),
            });
        }
        catch (error) {
            logger_js_1.logger.error('Error stopping Kafka consumer', {
                error: error.message,
                stack: error.stack,
                groupId: environment_js_1.config.KAFKA_GROUP_ID,
            });
        }
    }
    // Health check method
    isHealthy() {
        return this.isRunning && this.processingCount < 1000; // Reasonable processing queue
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            processingCount: this.processingCount,
            groupId: environment_js_1.config.KAFKA_GROUP_ID,
            topic: environment_js_1.config.KAFKA_TOPIC_COHERENCE,
            lastOffsets: Object.fromEntries(this.lastCommittedOffsets),
        };
    }
}
// Global consumer instance
let kafkaConsumer = null;
async function startKafkaConsumer() {
    if (environment_js_1.config.KAFKA_ENABLED !== 'true') {
        logger_js_1.logger.info('Kafka consumer disabled by configuration');
        return;
    }
    try {
        kafkaConsumer = new KafkaSignalConsumer();
        await kafkaConsumer.start();
        // Graceful shutdown handlers
        process.on('SIGTERM', async () => {
            logger_js_1.logger.info('Received SIGTERM, stopping Kafka consumer');
            if (kafkaConsumer) {
                await kafkaConsumer.stop();
            }
        });
        process.on('SIGINT', async () => {
            logger_js_1.logger.info('Received SIGINT, stopping Kafka consumer');
            if (kafkaConsumer) {
                await kafkaConsumer.stop();
            }
        });
    }
    catch (error) {
        logger_js_1.logger.error('Failed to start Kafka consumer', {
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}
function getKafkaConsumerStatus() {
    return (kafkaConsumer?.getStatus() || { isRunning: false, error: 'Not initialized' });
}
function isKafkaConsumerHealthy() {
    return kafkaConsumer?.isHealthy() || false;
}
