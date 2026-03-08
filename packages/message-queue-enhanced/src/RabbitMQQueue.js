"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQQueue = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const api_1 = require("@opentelemetry/api");
const pino = require("pino");
const DeadLetterQueue_1 = require("./DeadLetterQueue");
const logger = pino({ name: 'RabbitMQQueue' });
const tracer = api_1.trace.getTracer('message-queue-enhanced');
/**
 * RabbitMQ-based reliable task queuing
 */
class RabbitMQQueue {
    config;
    connection;
    channel;
    deadLetterQueue;
    handlers = new Map();
    stats = {
        total: 0,
        success: 0,
        failed: 0,
        retried: 0,
        deadLettered: 0,
        avgProcessingTime: 0,
    };
    constructor(config) {
        this.config = config;
    }
    /**
     * Initialize connection and channel
     */
    async initialize() {
        const span = tracer.startSpan('RabbitMQQueue.initialize');
        try {
            this.connection = await amqplib_1.default.connect(this.config.url);
            this.channel = await this.connection.createChannel();
            // Set prefetch for fair dispatch
            if (this.config.prefetch) {
                await this.channel.prefetch(this.config.prefetch);
            }
            // Initialize dead letter queue
            this.deadLetterQueue = new DeadLetterQueue_1.DeadLetterQueue(this.channel);
            await this.deadLetterQueue.initialize();
            logger.info('RabbitMQ initialized');
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Create queue with configuration
     */
    async createQueue(config) {
        const span = tracer.startSpan('RabbitMQQueue.createQueue');
        try {
            if (!this.channel) {
                throw new Error('Channel not initialized');
            }
            const queueOptions = {
                durable: config.durable !== false,
            };
            // Add dead letter exchange
            if (config.deadLetterExchange) {
                queueOptions.deadLetterExchange = config.deadLetterExchange;
            }
            // Add max length
            if (config.maxLength) {
                queueOptions.maxLength = config.maxLength;
            }
            // Add TTL
            if (config.ttl) {
                queueOptions.messageTtl = config.ttl;
            }
            // Add priority support
            if (config.priority) {
                queueOptions.maxPriority = 10;
            }
            await this.channel.assertQueue(config.name, queueOptions);
            logger.info({ queue: config.name }, 'Queue created');
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Publish message to queue
     */
    async publish(queueName, message) {
        const span = tracer.startSpan('RabbitMQQueue.publish');
        try {
            if (!this.channel) {
                throw new Error('Channel not initialized');
            }
            const options = {
                persistent: true,
                messageId: message.id,
                timestamp: message.timestamp,
                headers: {
                    ...message.headers,
                    retryCount: message.retryCount || 0,
                    maxRetries: message.maxRetries || 3,
                },
            };
            // Set priority
            if (message.priority) {
                const priorityMap = { high: 10, normal: 5, low: 1 };
                options.priority = priorityMap[message.priority];
            }
            this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message.payload)), options);
            this.stats.total++;
            this.stats.success++;
            span.setAttributes({
                queue: queueName,
                messageId: message.id,
            });
            logger.debug({ queue: queueName, messageId: message.id }, 'Message published');
        }
        catch (error) {
            this.stats.failed++;
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Consume messages from queue
     */
    async consume(queueName, handler) {
        const span = tracer.startSpan('RabbitMQQueue.consume');
        try {
            if (!this.channel) {
                throw new Error('Channel not initialized');
            }
            this.handlers.set(queueName, handler);
            await this.channel.consume(queueName, async (msg) => {
                if (!msg)
                    return;
                if (!msg) {
                    return;
                }
                await this.handleMessage(queueName, msg);
            }, { noAck: false });
            logger.info({ queue: queueName }, 'Started consuming');
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Handle incoming message
     */
    async handleMessage(queueName, msg) {
        const span = tracer.startSpan('RabbitMQQueue.handleMessage');
        const startTime = Date.now();
        try {
            if (!this.channel)
                return;
            if (!this.channel) {
                return;
            }
            const handler = this.handlers.get(queueName);
            if (!handler) {
                logger.warn({ queue: queueName }, 'No handler for queue');
                this.channel.nack(msg, false, false);
                return;
            }
            const message = {
                id: msg.properties.messageId || '',
                topic: queueName,
                payload: JSON.parse(msg.content.toString()),
                headers: msg.properties.headers || {},
                timestamp: msg.properties.timestamp || Date.now(),
                retryCount: msg.properties.headers?.retryCount || 0,
                maxRetries: msg.properties.headers?.maxRetries || 3,
            };
            // Execute handler
            await handler(message);
            // Acknowledge message
            this.channel.ack(msg);
            const processingTime = Date.now() - startTime;
            this.updateProcessingTime(processingTime);
            span.setAttributes({
                queue: queueName,
                messageId: message.id,
                processingTime,
            });
        }
        catch (error) {
            span.recordException(error);
            logger.error({ error, queue: queueName }, 'Message handling failed');
            // Handle retry logic
            await this.handleFailure(queueName, msg);
        }
        finally {
            span.end();
        }
    }
    /**
     * Handle message failure with retry logic
     */
    async handleFailure(queueName, msg) {
        if (!this.channel)
            return;
        if (!this.channel) {
            return;
        }
        const retryCount = (msg.properties.headers?.retryCount || 0) + 1;
        const maxRetries = msg.properties.headers?.maxRetries || 3;
        if (retryCount <= maxRetries) {
            // Retry message
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 60000);
            setTimeout(() => {
                if (!this.channel)
                    return;
                if (!this.channel) {
                    return;
                }
                this.channel.sendToQueue(queueName, msg.content, {
                    ...msg.properties,
                    headers: {
                        ...msg.properties.headers,
                        retryCount,
                    },
                });
                this.channel.ack(msg);
            }, retryDelay);
            this.stats.retried++;
            logger.info({ retryCount, maxRetries }, 'Message queued for retry');
        }
        else {
            // Send to dead letter queue
            if (this.deadLetterQueue) {
                await this.deadLetterQueue.send(queueName, msg);
                this.stats.deadLettered++;
            }
            this.channel.ack(msg);
            logger.warn('Message sent to dead letter queue');
        }
    }
    /**
     * Purge queue
     */
    async purgeQueue(queueName) {
        if (!this.channel) {
            throw new Error('Channel not initialized');
        }
        await this.channel.purgeQueue(queueName);
        logger.info({ queue: queueName }, 'Queue purged');
    }
    /**
     * Get queue info
     */
    async getQueueInfo(queueName) {
        if (!this.channel) {
            throw new Error('Channel not initialized');
        }
        return await this.channel.checkQueue(queueName);
    }
    /**
     * Get statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Disconnect
     */
    async disconnect() {
        if (this.channel) {
            await this.channel.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
        logger.info('RabbitMQ disconnected');
    }
    updateProcessingTime(time) {
        const total = this.stats.success + this.stats.failed;
        this.stats.avgProcessingTime =
            (this.stats.avgProcessingTime * (total - 1) + time) / total;
    }
}
exports.RabbitMQQueue = RabbitMQQueue;
