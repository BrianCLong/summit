"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadLetterQueue = void 0;
const api_1 = require("@opentelemetry/api");
const pino = require("pino");
const logger = pino({ name: 'DeadLetterQueue' });
const tracer = api_1.trace.getTracer('message-queue-enhanced');
/**
 * Dead letter queue for failed messages
 */
class DeadLetterQueue {
    channel;
    exchangeName = 'dlx.exchange';
    queueName = 'dlq.failed-messages';
    constructor(channel) {
        this.channel = channel;
    }
    /**
     * Initialize dead letter exchange and queue
     */
    async initialize() {
        const span = tracer.startSpan('DeadLetterQueue.initialize');
        try {
            // Create dead letter exchange
            await this.channel.assertExchange(this.exchangeName, 'topic', {
                durable: true,
            });
            // Create dead letter queue
            await this.channel.assertQueue(this.queueName, {
                durable: true,
            });
            // Bind queue to exchange
            await this.channel.bindQueue(this.queueName, this.exchangeName, '#' // Route all messages
            );
            logger.info('Dead letter queue initialized');
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
     * Send message to dead letter queue
     */
    async send(originalQueue, msg) {
        const span = tracer.startSpan('DeadLetterQueue.send');
        try {
            const routingKey = `dlq.${originalQueue}`;
            await this.channel.publish(this.exchangeName, routingKey, msg.content, {
                ...msg.properties,
                headers: {
                    ...msg.properties.headers,
                    'x-original-queue': originalQueue,
                    'x-death-timestamp': Date.now(),
                    'x-death-reason': 'max-retries-exceeded',
                },
            });
            logger.warn({ originalQueue, messageId: msg.properties.messageId }, 'Message sent to DLQ');
            span.setAttributes({
                originalQueue,
                messageId: msg.properties.messageId,
            });
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
     * Replay message from DLQ back to original queue
     */
    async replay(messageId) {
        const span = tracer.startSpan('DeadLetterQueue.replay');
        try {
            // Get message from DLQ
            const msg = await this.channel.get(this.queueName, { noAck: false });
            if (!msg) {
                throw new Error('Message not found in DLQ');
            }
            if (msg.properties.messageId !== messageId) {
                this.channel.nack(msg, false, true); // Requeue
                throw new Error('Message ID mismatch');
            }
            // Get original queue
            const originalQueue = msg.properties.headers?.['x-original-queue'];
            if (!originalQueue) {
                throw new Error('Original queue not found in headers');
            }
            // Reset retry count
            const headers = { ...msg.properties.headers };
            delete headers['x-death-timestamp'];
            delete headers['x-death-reason'];
            headers.retryCount = 0;
            // Send back to original queue
            await this.channel.sendToQueue(originalQueue, msg.content, {
                ...msg.properties,
                headers,
            });
            // Acknowledge DLQ message
            this.channel.ack(msg);
            logger.info({ messageId, originalQueue }, 'Message replayed from DLQ');
            span.setAttributes({
                messageId,
                originalQueue,
            });
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
     * Get DLQ statistics
     */
    async getStats() {
        return await this.channel.checkQueue(this.queueName);
    }
    /**
     * Purge DLQ
     */
    async purge() {
        await this.channel.purgeQueue(this.queueName);
        logger.info('DLQ purged');
    }
}
exports.DeadLetterQueue = DeadLetterQueue;
