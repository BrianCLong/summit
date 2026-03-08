"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionEngine = exports.SubscriptionEngine = void 0;
// @ts-nocheck
const node_crypto_1 = require("node:crypto");
const pino_1 = __importDefault(require("pino"));
const pubsub_js_1 = require("../subscriptions/pubsub.js");
const metrics_js_1 = require("../metrics.js");
class SubscriptionEngine {
    pubsub;
    logger = pino_1.default({ name: 'SubscriptionEngine' });
    connections = new Map();
    backpressureBytes;
    batchFlushIntervalMs;
    constructor(options = {}) {
        this.pubsub = options.pubsub ?? (0, pubsub_js_1.makePubSub)();
        this.backpressureBytes = options.backpressureBytes ?? 512 * 1024; // 512KB
        this.batchFlushIntervalMs = options.batchFlushIntervalMs ?? 250;
    }
    getPubSub() {
        return this.pubsub;
    }
    registerConnection(id, socket) {
        this.connections.set(id, { socket, subscriptions: new Set() });
        metrics_js_1.websocketConnectionsActive.inc();
        this.logger.info({ id }, 'Registered GraphQL WebSocket connection');
    }
    unregisterConnection(id) {
        const connection = this.connections.get(id);
        if (connection) {
            this.connections.delete(id);
            metrics_js_1.websocketConnectionsActive.dec();
            this.logger.info({ id }, 'Closed GraphQL WebSocket connection');
        }
    }
    trackSubscription(connectionId, subscriptionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.subscriptions.add(subscriptionId);
        }
    }
    completeSubscription(connectionId, subscriptionId) {
        const connection = this.connections.get(connectionId);
        if (connection && subscriptionId) {
            connection.subscriptions.delete(subscriptionId);
        }
    }
    enforceBackpressure(socket) {
        if (socket.bufferedAmount > this.backpressureBytes) {
            metrics_js_1.subscriptionBackpressureTotal.inc();
            socket.close(1013, 'Backpressure threshold exceeded');
            return false;
        }
        return true;
    }
    async publish(trigger, payload, metadata) {
        const envelope = {
            id: (0, node_crypto_1.randomUUID)(),
            payload,
            timestamp: Date.now(),
            metadata,
        };
        await this.pubsub.publish(trigger, envelope);
    }
    createFilteredAsyncIterator(triggers, predicate) {
        const iterator = this.pubsub.asyncIterator(triggers);
        const filter = async function* () {
            for await (const event of iterator) {
                if (await predicate(event)) {
                    yield event;
                }
            }
        }();
        return filter;
    }
    createBatchedAsyncIterator(triggers, predicate, options) {
        const source = this.createFilteredAsyncIterator(triggers, predicate);
        const batchSize = options?.batchSize ?? 25;
        const flushInterval = options?.flushIntervalMs ?? this.batchFlushIntervalMs;
        const iterator = async function* () {
            const queue = [];
            let active = true;
            (async () => {
                for await (const event of source) {
                    queue.push(event);
                }
                active = false;
            })();
            while (active || queue.length) {
                if (!queue.length) {
                    await new Promise((resolve) => setTimeout(resolve, flushInterval));
                    continue;
                }
                const batch = queue.splice(0, batchSize);
                metrics_js_1.subscriptionBatchesEmitted.observe(batch.length);
                yield batch;
                if (queue.length === 0) {
                    await new Promise((resolve) => setTimeout(resolve, flushInterval));
                }
            }
        }();
        return iterator;
    }
    recordFanout(start) {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        metrics_js_1.subscriptionFanoutLatency.observe(durationMs);
    }
}
exports.SubscriptionEngine = SubscriptionEngine;
exports.subscriptionEngine = new SubscriptionEngine();
