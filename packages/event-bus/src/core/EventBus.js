"use strict";
/**
 * EventBus - Core Distributed Message Bus Implementation
 *
 * Enterprise-grade event bus with pub-sub, queuing, and message routing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const ioredis_1 = __importDefault(require("ioredis"));
const kafkajs_1 = require("kafkajs");
const pino_1 = __importDefault(require("pino"));
class EventBus extends events_1.EventEmitter {
    config;
    redis;
    kafka;
    kafkaProducer;
    kafkaConsumers = new Map();
    subscriptions = new Map();
    logger;
    metrics;
    processing = new Map();
    constructor(config) {
        super();
        this.config = config;
        this.logger = (0, pino_1.default)({ name: `EventBus:${config.name}` });
        this.metrics = {
            messagesPublished: 0,
            messagesConsumed: 0,
            messagesFailed: 0,
            messagesDeadLettered: 0,
            averageLatency: 0,
            activeSubscriptions: 0,
            queueDepth: 0
        };
    }
    /**
     * Initialize the event bus and connect to backends
     */
    async initialize() {
        this.logger.info('Initializing EventBus...');
        // Initialize Redis for local pub-sub and caching
        if (this.config.redis) {
            this.redis = new ioredis_1.default({
                host: this.config.redis.host,
                port: this.config.redis.port,
                password: this.config.redis.password,
                db: this.config.redis.db || 0,
                keyPrefix: this.config.redis.keyPrefix || 'eventbus:'
            });
            this.redis.on('error', (err) => {
                this.logger.error({ err }, 'Redis connection error');
            });
        }
        // Initialize Kafka for distributed messaging
        if (this.config.kafka) {
            this.kafka = new kafkajs_1.Kafka({
                clientId: this.config.kafka.clientId || this.config.name,
                brokers: this.config.kafka.brokers,
                ssl: this.config.kafka.ssl,
                sasl: this.config.kafka.sasl
            });
            this.kafkaProducer = this.kafka.producer();
            await this.kafkaProducer.connect();
        }
        this.logger.info('EventBus initialized successfully');
    }
    /**
     * Publish a message to a topic
     */
    async publish(topic, payload, options = {}) {
        const messageId = (0, uuid_1.v4)();
        const message = {
            metadata: {
                messageId,
                timestamp: new Date(),
                source: this.config.name,
                version: '1.0',
                traceId: options.persistent ? (0, uuid_1.v4)() : undefined
            },
            payload,
            topic,
            priority: options.priority,
            ttl: options.ttl,
            delayed: options.delayed
        };
        this.logger.debug({ messageId, topic }, 'Publishing message');
        // Publish to Redis for fast local delivery
        if (this.redis) {
            await this.redis.publish(topic, JSON.stringify(message));
        }
        // Publish to Kafka for distributed persistence
        if (this.kafkaProducer && options.persistent) {
            await this.kafkaProducer.send({
                topic,
                messages: [{
                        key: message.metadata.messageId,
                        value: JSON.stringify(message),
                        headers: message.metadata.headers
                    }]
            });
        }
        this.metrics.messagesPublished++;
        this.emit('message:published', { messageId, topic });
        return messageId;
    }
    /**
     * Subscribe to messages on a topic
     */
    async subscribe(topic, handler, options = {}) {
        const subscriptionId = (0, uuid_1.v4)();
        this.logger.info({ subscriptionId, topic }, 'Creating subscription');
        // Subscribe to Redis
        if (this.redis) {
            const subscriber = this.redis.duplicate();
            await subscriber.subscribe(topic);
            subscriber.on('message', async (channel, messageStr) => {
                if (channel === topic) {
                    const message = JSON.parse(messageStr);
                    await this.handleMessage(message, handler, options);
                }
            });
        }
        // Subscribe to Kafka
        if (this.kafka) {
            const consumer = this.kafka.consumer({
                groupId: `${this.config.name}-${topic}`
            });
            await consumer.connect();
            await consumer.subscribe({ topic, fromBeginning: false });
            await consumer.run({
                eachMessage: async (payload) => {
                    const message = JSON.parse(payload.message.value?.toString() || '{}');
                    await this.handleMessage(message, handler, options);
                }
            });
            this.kafkaConsumers.set(subscriptionId, consumer);
        }
        const subscription = {
            id: subscriptionId,
            topic,
            handler,
            options,
            unsubscribe: async () => {
                await this.unsubscribe(subscriptionId);
            }
        };
        this.subscriptions.set(subscriptionId, subscription);
        this.metrics.activeSubscriptions = this.subscriptions.size;
        return subscription;
    }
    /**
     * Publish to a queue (point-to-point)
     */
    async enqueue(queue, payload, options = {}) {
        const messageId = (0, uuid_1.v4)();
        const message = {
            metadata: {
                messageId,
                timestamp: new Date(),
                source: this.config.name,
                version: '1.0'
            },
            payload,
            queue,
            priority: options.priority || 0
        };
        this.logger.debug({ messageId, queue }, 'Enqueueing message');
        if (this.redis) {
            const queueKey = `queue:${queue}`;
            const priority = options.priority || 0;
            // Use sorted set for priority queue
            await this.redis.zadd(queueKey, priority, JSON.stringify(message));
        }
        this.metrics.messagesPublished++;
        return messageId;
    }
    /**
     * Subscribe to queue messages
     */
    async subscribeQueue(queue, handler, options = {}) {
        const subscriptionId = (0, uuid_1.v4)();
        this.logger.info({ subscriptionId, queue }, 'Creating queue subscription');
        // Poll queue for messages
        const pollQueue = async () => {
            if (!this.redis)
                return;
            if (!this.redis) {
                return;
            }
            const queueKey = `queue:${queue}`;
            const prefetch = options.prefetchCount || 1;
            while (this.subscriptions.has(subscriptionId)) {
                try {
                    // Pop highest priority message
                    const result = await this.redis.zpopmax(queueKey, prefetch);
                    if (result && result.length > 0) {
                        for (let i = 0; i < result.length; i += 2) {
                            const messageStr = result[i];
                            const message = JSON.parse(messageStr);
                            await this.handleMessage(message, handler, options);
                        }
                    }
                    else {
                        // No messages, wait before polling again
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                catch (err) {
                    this.logger.error({ err, queue }, 'Queue polling error');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        };
        // Start polling
        pollQueue().catch(err => {
            this.logger.error({ err, queue }, 'Queue subscription error');
        });
        const subscription = {
            id: subscriptionId,
            queue,
            handler,
            options,
            unsubscribe: async () => {
                await this.unsubscribe(subscriptionId);
            }
        };
        this.subscriptions.set(subscriptionId, subscription);
        this.metrics.activeSubscriptions = this.subscriptions.size;
        return subscription;
    }
    /**
     * Handle incoming message with retries and error handling
     */
    async handleMessage(message, handler, options) {
        const envelope = {
            ...message,
            deliveryInfo: {
                attempt: 1,
                firstAttemptedAt: new Date()
            }
        };
        const maxRetries = options.maxRetries || this.config.maxRetries || 3;
        const retryDelay = options.retryDelay || this.config.retryDelay || 1000;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            envelope.deliveryInfo.attempt = attempt;
            envelope.deliveryInfo.lastAttemptedAt = new Date();
            try {
                this.processing.set(message.metadata.messageId, envelope);
                await handler(envelope);
                this.processing.delete(message.metadata.messageId);
                this.metrics.messagesConsumed++;
                this.emit('message:consumed', {
                    messageId: message.metadata.messageId
                });
                return; // Success
            }
            catch (err) {
                this.logger.error({ err, messageId: message.metadata.messageId, attempt }, 'Message handling failed');
                if (attempt < maxRetries) {
                    // Calculate backoff
                    const delay = options.retryBackoff === 'exponential'
                        ? retryDelay * Math.pow(2, attempt - 1)
                        : retryDelay;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                else {
                    // Max retries exceeded
                    this.processing.delete(message.metadata.messageId);
                    this.metrics.messagesFailed++;
                    // Send to dead letter queue
                    if (options.deadLetterQueue) {
                        await this.sendToDeadLetter(envelope, options.deadLetterQueue);
                    }
                    this.emit('message:failed', {
                        messageId: message.metadata.messageId,
                        error: err
                    });
                }
            }
        }
    }
    /**
     * Send message to dead letter queue
     */
    async sendToDeadLetter(envelope, dlqName) {
        if (!this.redis)
            return;
        if (!this.redis) {
            return;
        }
        const dlqKey = `dlq:${dlqName}`;
        await this.redis.lpush(dlqKey, JSON.stringify(envelope));
        this.metrics.messagesDeadLettered++;
        this.logger.warn({ messageId: envelope.metadata.messageId, dlq: dlqName }, 'Message sent to dead letter queue');
    }
    /**
     * Unsubscribe from a subscription
     */
    async unsubscribe(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription)
            return;
        if (!subscription) {
            return;
        }
        // Disconnect Kafka consumer
        const consumer = this.kafkaConsumers.get(subscriptionId);
        if (consumer) {
            await consumer.disconnect();
            this.kafkaConsumers.delete(subscriptionId);
        }
        this.subscriptions.delete(subscriptionId);
        this.metrics.activeSubscriptions = this.subscriptions.size;
        this.logger.info({ subscriptionId }, 'Unsubscribed');
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Shutdown the event bus
     */
    async shutdown() {
        this.logger.info('Shutting down EventBus...');
        // Close all subscriptions
        for (const subscription of this.subscriptions.values()) {
            await subscription.unsubscribe();
        }
        // Disconnect Kafka
        if (this.kafkaProducer) {
            await this.kafkaProducer.disconnect();
        }
        // Disconnect Redis
        if (this.redis) {
            await this.redis.quit();
        }
        this.logger.info('EventBus shut down successfully');
    }
}
exports.EventBus = EventBus;
