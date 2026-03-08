"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadLetterQueue = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'dlq' });
/**
 * Dead Letter Queue for failed message handling
 */
class DeadLetterQueue {
    kafka;
    dlqTopic;
    maxRetries;
    producer = null;
    retryCount = new Map();
    constructor(kafka, dlqTopic, maxRetries = 3) {
        this.kafka = kafka;
        this.dlqTopic = dlqTopic;
        this.maxRetries = maxRetries;
    }
    /**
     * Connect DLQ producer
     */
    async connect() {
        this.producer = this.kafka.producer({
            idempotent: true,
        });
        await this.producer.connect();
        logger.info({ dlqTopic: this.dlqTopic }, 'DLQ producer connected');
    }
    /**
     * Send failed message to DLQ
     */
    async send(originalTopic, message, error) {
        if (!this.producer) {
            throw new Error('DLQ producer not connected');
        }
        const messageKey = `${originalTopic}-${message.offset}`;
        const currentRetries = this.retryCount.get(messageKey) || 0;
        if (currentRetries >= this.maxRetries) {
            logger.error({
                originalTopic,
                offset: message.offset,
                retries: currentRetries,
            }, 'Message exceeded max retries, sending to DLQ');
            await this.producer.send({
                topic: this.dlqTopic,
                messages: [
                    {
                        key: message.key,
                        value: message.value,
                        headers: {
                            ...message.headers,
                            'dlq.original-topic': originalTopic,
                            'dlq.original-offset': message.offset,
                            'dlq.error': error.message,
                            'dlq.retry-count': String(currentRetries),
                            'dlq.timestamp': Date.now().toString(),
                        },
                    },
                ],
            });
            this.retryCount.delete(messageKey);
        }
        else {
            this.retryCount.set(messageKey, currentRetries + 1);
            logger.warn({
                originalTopic,
                offset: message.offset,
                retries: currentRetries + 1,
            }, 'Message will be retried');
        }
    }
    /**
     * Disconnect DLQ producer
     */
    async disconnect() {
        if (this.producer) {
            await this.producer.disconnect();
            this.producer = null;
            logger.info('DLQ producer disconnected');
        }
    }
    /**
     * Get retry count for message
     */
    getRetryCount(topic, offset) {
        return this.retryCount.get(`${topic}-${offset}`) || 0;
    }
    /**
     * Clear retry count
     */
    clearRetryCount(topic, offset) {
        this.retryCount.delete(`${topic}-${offset}`);
    }
}
exports.DeadLetterQueue = DeadLetterQueue;
