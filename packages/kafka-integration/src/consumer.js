"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaConsumer = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars, @typescript-eslint/no-non-null-assertion, require-await */
// @ts-nocheck
const kafkajs_1 = require("kafkajs");
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const schema_registry_js_1 = require("./schema-registry.js");
const dlq_js_1 = require("./dlq.js");
const logger = (0, pino_1.default)({ name: 'kafka-consumer' });
const tracer = api_1.trace.getTracer('kafka-consumer');
/**
 * High-performance Kafka consumer with automatic offset management
 */
class KafkaConsumer {
    config;
    consumerConfig;
    kafka;
    consumer = null;
    schemaRegistry = null;
    dlq = null;
    isRunning = false;
    messageHandlers = new Map();
    constructor(config, consumerConfig, schemaRegistryUrl, dlqConfig) {
        this.config = config;
        this.consumerConfig = consumerConfig;
        this.kafka = new kafkajs_1.Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
            ssl: config.ssl,
            sasl: config.sasl,
            connectionTimeout: config.connectionTimeout,
            requestTimeout: config.requestTimeout,
            retry: config.retry,
        });
        if (schemaRegistryUrl) {
            this.schemaRegistry = new schema_registry_js_1.SchemaRegistryClient({ host: schemaRegistryUrl });
        }
        if (dlqConfig) {
            this.dlq = new dlq_js_1.DeadLetterQueue(this.kafka, dlqConfig.topic, dlqConfig.maxRetries);
        }
    }
    /**
     * Connect and initialize consumer
     */
    async connect() {
        const span = tracer.startSpan('kafka.consumer.connect');
        try {
            this.consumer = this.kafka.consumer({
                groupId: this.consumerConfig.groupId,
                sessionTimeout: this.consumerConfig.sessionTimeout,
                rebalanceTimeout: this.consumerConfig.rebalanceTimeout,
                heartbeatInterval: this.consumerConfig.heartbeatInterval,
                maxBytesPerPartition: this.consumerConfig.maxBytesPerPartition,
                minBytes: this.consumerConfig.minBytes,
                maxBytes: this.consumerConfig.maxBytes,
                maxWaitTimeInMs: this.consumerConfig.maxWaitTimeInMs,
            });
            await this.consumer.connect();
            if (this.dlq) {
                await this.dlq.connect();
            }
            logger.info({ groupId: this.consumerConfig.groupId }, 'Kafka consumer connected');
            span.setStatus({ code: api_1.SpanStatusCode.OK });
        }
        catch (error) {
            logger.error({ error }, 'Failed to connect consumer');
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Subscribe to topics
     */
    async subscribe(topics) {
        if (!this.consumer) {
            throw new Error('Consumer not connected');
        }
        await this.consumer.subscribe({
            topics,
            fromBeginning: false,
        });
        logger.info({ topics }, 'Subscribed to topics');
    }
    /**
     * Register message handler for specific topic
     */
    registerHandler(topic, handler) {
        this.messageHandlers.set(topic, handler);
        logger.info({ topic }, 'Handler registered');
    }
    /**
     * Start consuming messages
     */
    async start() {
        if (!this.consumer) {
            throw new Error('Consumer not connected');
        }
        if (this.isRunning) {
            logger.warn('Consumer already running');
            return;
        }
        this.isRunning = true;
        await this.consumer.run({
            autoCommit: this.consumerConfig.autoCommit ?? false,
            autoCommitInterval: this.consumerConfig.autoCommitInterval,
            autoCommitThreshold: this.consumerConfig.autoCommitThreshold,
            eachMessage: this.handleMessage.bind(this),
        });
        logger.info('Consumer started');
    }
    /**
     * Handle individual message
     */
    async handleMessage(payload) {
        const { topic, partition, message } = payload;
        const span = tracer.startSpan('kafka.consumer.message', {
            attributes: {
                'messaging.system': 'kafka',
                'messaging.destination': topic,
                'messaging.kafka.partition': partition,
                'messaging.kafka.offset': message.offset,
            },
        });
        try {
            // Decode message
            const streamMessage = await this.decodeMessage(message);
            if (!streamMessage) {
                logger.warn({ topic, partition, offset: message.offset }, 'Failed to decode message');
                return;
            }
            // Get handler for topic
            const handler = this.messageHandlers.get(topic);
            if (!handler) {
                logger.warn({ topic }, 'No handler registered for topic');
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: 'No handler' });
                span.end();
                return;
            }
            // Process message
            const result = await handler(streamMessage, {
                topic,
                partition,
                offset: message.offset,
            });
            if (result.success) {
                // Commit offset on success (if manual commit)
                if (!this.consumerConfig.autoCommit) {
                    await payload.heartbeat();
                    await this.consumer.commitOffsets([
                        {
                            topic,
                            partition,
                            offset: (BigInt(message.offset) + BigInt(1)).toString(),
                        },
                    ]);
                }
                span.setStatus({ code: api_1.SpanStatusCode.OK });
            }
            else {
                // Send to DLQ if processing failed and not retryable
                if (!result.retryable && this.dlq) {
                    await this.dlq.send(topic, message, result.error);
                }
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: result.error?.message || 'Processing failed',
                });
            }
        }
        catch (error) {
            logger.error({ error, topic, partition, offset: message.offset }, 'Error processing message');
            // Send to DLQ on exception
            if (this.dlq) {
                await this.dlq.send(topic, message, error);
            }
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
        }
        finally {
            span.end();
        }
    }
    /**
     * Decode message from Kafka
     */
    async decodeMessage(message) {
        if (!message.value) {
            return null;
        }
        try {
            // Try schema registry first
            if (this.schemaRegistry) {
                try {
                    return await this.schemaRegistry.decode(message.value);
                }
                catch (error) {
                    // Fall back to JSON
                    logger.debug('Schema registry decode failed, falling back to JSON');
                }
            }
            // Fall back to JSON parsing
            const decoded = JSON.parse(message.value.toString());
            return decoded;
        }
        catch (error) {
            logger.error({ error }, 'Failed to decode message');
            return null;
        }
    }
    /**
     * Pause consumption
     */
    async pause(topics) {
        if (!this.consumer) {
            throw new Error('Consumer not connected');
        }
        if (topics) {
            this.consumer.pause(topics);
        }
        else {
            this.consumer.pause(Array.from(this.messageHandlers.keys()).map((topic) => ({ topic })));
        }
        logger.info({ topics }, 'Consumer paused');
    }
    /**
     * Resume consumption
     */
    async resume(topics) {
        if (!this.consumer) {
            throw new Error('Consumer not connected');
        }
        if (topics) {
            this.consumer.resume(topics);
        }
        else {
            this.consumer.resume(Array.from(this.messageHandlers.keys()).map((topic) => ({ topic })));
        }
        logger.info({ topics }, 'Consumer resumed');
    }
    /**
     * Stop consuming and disconnect
     */
    async stop() {
        this.isRunning = false;
        if (this.consumer) {
            await this.consumer.stop();
            await this.consumer.disconnect();
            this.consumer = null;
        }
        if (this.dlq) {
            await this.dlq.disconnect();
        }
        logger.info('Consumer stopped');
    }
    /**
     * Get consumer lag for monitoring
     */
    async getLag() {
        if (!this.consumer) {
            throw new Error('Consumer not connected');
        }
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            const topics = Array.from(this.messageHandlers.keys());
            const offsets = await admin.fetchOffsets({
                groupId: this.consumerConfig.groupId,
                topics,
            });
            const lagData = [];
            for (const topicOffset of offsets) {
                for (const partition of topicOffset.partitions) {
                    const lag = BigInt(partition.high) - BigInt(partition.offset);
                    lagData.push({
                        topic: topicOffset.topic,
                        partition: partition.partition,
                        offset: partition.offset,
                        highWaterMark: partition.high,
                        lag: lag.toString(),
                    });
                }
            }
            return lagData;
        }
        finally {
            await admin.disconnect();
        }
    }
}
exports.KafkaConsumer = KafkaConsumer;
