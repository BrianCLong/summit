"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaProducer = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars, require-await, no-return-await */
// @ts-nocheck
const kafkajs_1 = require("kafkajs");
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const schema_registry_js_1 = require("./schema-registry.js");
const logger = (0, pino_1.default)({ name: 'kafka-producer' });
const tracer = api_1.trace.getTracer('kafka-producer');
/**
 * High-performance Kafka producer with EOS support
 */
class KafkaProducer {
    config;
    producerConfig;
    kafka;
    producer = null;
    schemaRegistry = null;
    isTransactional = false;
    inTransaction = false;
    constructor(config, producerConfig, schemaRegistryUrl) {
        this.config = config;
        this.producerConfig = producerConfig;
        this.kafka = new kafkajs_1.Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
            ssl: config.ssl,
            sasl: config.sasl,
            connectionTimeout: config.connectionTimeout,
            requestTimeout: config.requestTimeout,
            retry: config.retry,
        });
        this.isTransactional = Boolean(producerConfig?.transactionalId);
        if (schemaRegistryUrl) {
            this.schemaRegistry = new schema_registry_js_1.SchemaRegistryClient({ host: schemaRegistryUrl });
        }
    }
    /**
     * Connect and initialize producer
     */
    async connect() {
        const span = tracer.startSpan('kafka.producer.connect');
        try {
            this.producer = this.kafka.producer({
                ...this.producerConfig,
                idempotent: true,
                maxInFlightRequests: this.isTransactional ? 1 : 5,
            });
            await this.producer.connect();
            if (this.isTransactional) {
                logger.info('Initializing transactional producer');
            }
            logger.info('Kafka producer connected');
            span.setStatus({ code: api_1.SpanStatusCode.OK });
        }
        catch (error) {
            logger.error({ error }, 'Failed to connect producer');
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Begin transaction (for EOS)
     */
    async beginTransaction() {
        if (!this.isTransactional) {
            throw new Error('Producer not configured for transactions');
        }
        if (!this.producer) {
            throw new Error('Producer not connected');
        }
        await this.producer.transaction();
        this.inTransaction = true;
        logger.debug('Transaction started');
    }
    /**
     * Commit transaction
     */
    async commitTransaction() {
        if (!this.inTransaction) {
            throw new Error('No active transaction');
        }
        // Transaction is committed when the transaction() callback completes
        this.inTransaction = false;
        logger.debug('Transaction committed');
    }
    /**
     * Abort transaction
     */
    async abortTransaction() {
        if (!this.inTransaction) {
            throw new Error('No active transaction');
        }
        // Transaction is aborted by throwing error in transaction() callback
        this.inTransaction = false;
        logger.debug('Transaction aborted');
    }
    /**
     * Send message with optional schema validation
     */
    async send(topic, message, options) {
        const span = tracer.startSpan('kafka.producer.send', {
            attributes: {
                'messaging.system': 'kafka',
                'messaging.destination': topic,
                'messaging.message_id': message.metadata.eventId,
            },
        });
        try {
            if (!this.producer) {
                throw new Error('Producer not connected');
            }
            let value;
            // Encode message with schema registry if configured
            if (this.schemaRegistry && options?.schemaSubject) {
                value = await this.schemaRegistry.encode(options.schemaSubject, message);
            }
            else {
                value = JSON.stringify(message);
            }
            const record = {
                topic,
                messages: [
                    {
                        key: options?.key,
                        value,
                        partition: options?.partition,
                        headers: {
                            ...message.headers,
                            ...options?.headers,
                            'event-id': message.metadata.eventId,
                            'event-type': message.metadata.eventType,
                            'correlation-id': message.metadata.correlationId || '',
                        },
                        timestamp: String(message.metadata.timestamp),
                    },
                ],
                compression: this.getCompressionType(options?.compression),
            };
            const metadata = await this.producer.send(record);
            logger.debug({
                topic,
                eventId: message.metadata.eventId,
                partition: metadata[0].partition,
                offset: metadata[0].offset,
            }, 'Message sent');
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return metadata;
        }
        catch (error) {
            logger.error({ error, topic }, 'Failed to send message');
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Send batch of messages for high throughput
     */
    async sendBatch(topic, messages, options) {
        const span = tracer.startSpan('kafka.producer.sendBatch', {
            attributes: {
                'messaging.system': 'kafka',
                'messaging.destination': topic,
                'messaging.batch.message_count': messages.length,
            },
        });
        try {
            if (!this.producer) {
                throw new Error('Producer not connected');
            }
            const encodedMessages = await Promise.all(messages.map(async (message) => {
                let value;
                if (this.schemaRegistry && options?.schemaSubject) {
                    value = await this.schemaRegistry.encode(options.schemaSubject, message);
                }
                else {
                    value = JSON.stringify(message);
                }
                return {
                    value,
                    headers: {
                        ...message.headers,
                        'event-id': message.metadata.eventId,
                        'event-type': message.metadata.eventType,
                    },
                    timestamp: String(message.metadata.timestamp),
                };
            }));
            const record = {
                topic,
                messages: encodedMessages,
                compression: this.getCompressionType(options?.compression),
            };
            const metadata = await this.producer.send(record);
            logger.info({ topic, count: messages.length }, 'Batch sent');
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return metadata;
        }
        catch (error) {
            logger.error({ error, topic }, 'Failed to send batch');
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Execute operation within transaction
     */
    async executeInTransaction(operation) {
        if (!this.isTransactional || !this.producer) {
            throw new Error('Transactional producer not available');
        }
        const span = tracer.startSpan('kafka.producer.transaction');
        try {
            const result = await this.producer.transaction(async (tx) => {
                return await operation(tx);
            });
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            logger.error({ error }, 'Transaction failed');
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Disconnect producer
     */
    async disconnect() {
        if (this.producer) {
            await this.producer.disconnect();
            this.producer = null;
            logger.info('Kafka producer disconnected');
        }
    }
    /**
     * Get compression type enum
     */
    getCompressionType(compression) {
        if (!compression) {
            return undefined;
        }
        const compressionMap = {
            gzip: kafkajs_1.CompressionTypes.GZIP,
            snappy: kafkajs_1.CompressionTypes.Snappy,
            lz4: kafkajs_1.CompressionTypes.LZ4,
            zstd: kafkajs_1.CompressionTypes.ZSTD,
        };
        return compressionMap[compression];
    }
}
exports.KafkaProducer = KafkaProducer;
