"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GossipProtocol = void 0;
const database_js_1 = require("../../config/database.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const crypto_1 = require("crypto");
class GossipProtocol {
    publisher = null;
    subscriber = null;
    nodeId;
    handlers = new Map();
    constructor(nodeId) {
        this.nodeId = nodeId;
    }
    async initialize() {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis) {
            logger_js_1.default.warn('Redis not available for GossipProtocol');
            return;
        }
        this.publisher = redis.duplicate();
        this.subscriber = redis.duplicate();
        await this.subscriber.subscribe('swarm:gossip', 'swarm:consensus');
        this.subscriber.on('message', (channel, message) => {
            try {
                const parsed = JSON.parse(message);
                // Don't process own messages
                if (parsed.senderId === this.nodeId)
                    return;
                const handler = this.handlers.get(channel);
                if (handler) {
                    handler(parsed);
                }
            }
            catch (err) {
                logger_js_1.default.error('Failed to parse gossip message', err);
            }
        });
    }
    async broadcast(channel, message) {
        if (!this.publisher)
            return;
        const fullMessage = {
            ...message,
            id: (0, crypto_1.randomUUID)(),
            senderId: this.nodeId,
            timestamp: Date.now(),
        };
        await this.publisher.publish(channel, JSON.stringify(fullMessage));
    }
    on(channel, handler) {
        this.handlers.set(channel, handler);
    }
    async shutdown() {
        if (this.publisher)
            await this.publisher.quit();
        if (this.subscriber)
            await this.subscriber.quit();
    }
}
exports.GossipProtocol = GossipProtocol;
