"use strict";
/**
 * RequestReply - Request-reply messaging pattern
 *
 * Implements synchronous-style communication over async messaging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestReply = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
class RequestReply extends events_1.EventEmitter {
    eventBus;
    logger;
    pendingRequests = new Map();
    constructor(eventBus) {
        super();
        this.eventBus = eventBus;
        this.logger = (0, pino_1.default)({ name: 'RequestReply' });
    }
    /**
     * Initialize request-reply handler
     */
    async initialize() {
        // Subscribe to reply topic
        await this.eventBus.subscribe('request-reply.replies', async (message) => {
            const reply = message.payload;
            this.handleReply(reply);
        });
        this.logger.info('RequestReply initialized');
    }
    /**
     * Send a request and wait for reply
     */
    async request(topic, payload, timeout = 30000) {
        const requestId = (0, uuid_1.v4)();
        const correlationId = (0, uuid_1.v4)();
        const request = {
            requestId,
            replyTo: 'request-reply.replies',
            correlationId,
            payload,
            timeout,
            timestamp: new Date()
        };
        this.logger.debug({ requestId, topic }, 'Sending request');
        // Create promise for reply
        const replyPromise = new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
            this.pendingRequests.set(requestId, {
                resolve: resolve,
                reject,
                timeout: timeoutHandle
            });
        });
        // Publish request
        await this.eventBus.publish(topic, request);
        this.emit('request:sent', { requestId, topic });
        return replyPromise;
    }
    /**
     * Register handler for requests
     */
    async handleRequests(topic, handler) {
        await this.eventBus.subscribe(topic, async (message) => {
            const request = message.payload;
            this.logger.debug({ requestId: request.requestId, topic }, 'Handling request');
            try {
                const result = await handler(request);
                const reply = {
                    requestId: request.requestId,
                    correlationId: request.correlationId,
                    success: true,
                    payload: result,
                    timestamp: new Date()
                };
                // Send reply
                await this.eventBus.publish(request.replyTo, reply);
                this.emit('request:handled', { requestId: request.requestId });
            }
            catch (err) {
                this.logger.error({ err, requestId: request.requestId }, 'Request handler error');
                const reply = {
                    requestId: request.requestId,
                    correlationId: request.correlationId,
                    success: false,
                    error: err.message,
                    timestamp: new Date()
                };
                await this.eventBus.publish(request.replyTo, reply);
                this.emit('request:failed', {
                    requestId: request.requestId,
                    error: err.message
                });
            }
        });
        this.logger.info({ topic }, 'Request handler registered');
    }
    /**
     * Handle incoming reply
     */
    handleReply(reply) {
        const pending = this.pendingRequests.get(reply.requestId);
        if (!pending) {
            this.logger.warn({ requestId: reply.requestId }, 'Received reply for unknown request');
            return;
        }
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(reply.requestId);
        if (reply.success) {
            pending.resolve(reply);
            this.emit('reply:received', { requestId: reply.requestId });
        }
        else {
            pending.reject(new Error(reply.error || 'Request failed'));
            this.emit('reply:error', {
                requestId: reply.requestId,
                error: reply.error
            });
        }
    }
    /**
     * Get pending request count
     */
    getPendingCount() {
        return this.pendingRequests.size;
    }
}
exports.RequestReply = RequestReply;
