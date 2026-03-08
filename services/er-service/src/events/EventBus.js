"use strict";
/**
 * Event Bus
 *
 * Publishes ER events to Kafka for Graph Core and other consumers.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EREventBus = void 0;
exports.initializeEventBus = initializeEventBus;
exports.getEventBus = getEventBus;
const kafkajs_1 = require("kafkajs");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const pino_1 = __importDefault(require("pino"));
const uuid_1 = require("uuid");
const logger = (0, pino_1.default)({ name: 'EREventBus' });
class EREventBus {
    kafka;
    producer;
    consumer;
    eventSubject = new rxjs_1.Subject();
    topic;
    connected = false;
    constructor(config) {
        this.kafka = new kafkajs_1.Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
        });
        this.producer = this.kafka.producer();
        this.consumer = this.kafka.consumer({
            groupId: config.groupId ?? `${config.clientId}-group`,
        });
        this.topic = config.topic;
    }
    async connect() {
        if (this.connected)
            return;
        try {
            await this.producer.connect();
            await this.consumer.connect();
            await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
            await this.consumer.run({
                eachMessage: async ({ message }) => {
                    if (message.value) {
                        try {
                            const event = JSON.parse(message.value.toString());
                            this.eventSubject.next(event);
                        }
                        catch (error) {
                            logger.error({ error, message: message.value.toString() }, 'Failed to parse event');
                        }
                    }
                },
            });
            this.connected = true;
            logger.info({ topic: this.topic }, 'EventBus connected to Kafka');
        }
        catch (error) {
            logger.error({ error }, 'Failed to connect to Kafka');
            throw error;
        }
    }
    async disconnect() {
        if (!this.connected)
            return;
        await this.producer.disconnect();
        await this.consumer.disconnect();
        this.connected = false;
        logger.info('EventBus disconnected from Kafka');
    }
    /**
     * Publish an event
     */
    async publish(event) {
        if (!this.connected) {
            logger.warn('EventBus not connected, event not published');
            return;
        }
        await this.producer.send({
            topic: this.topic,
            messages: [
                {
                    key: event.clusterId ?? event.eventId,
                    value: JSON.stringify(event),
                    headers: {
                        eventType: event.eventType,
                        entityType: event.entityType,
                        tenantId: event.tenantId,
                        timestamp: event.timestamp,
                    },
                },
            ],
        });
        logger.debug({ eventId: event.eventId, eventType: event.eventType }, 'Event published');
    }
    /**
     * Subscribe to all events
     */
    subscribe() {
        return this.eventSubject.asObservable();
    }
    /**
     * Subscribe to events by type
     */
    subscribeByType(eventType) {
        return this.eventSubject.pipe((0, operators_1.filter)((e) => e.eventType === eventType));
    }
    /**
     * Subscribe to events by entity type
     */
    subscribeByEntityType(entityType) {
        return this.eventSubject.pipe((0, operators_1.filter)((e) => e.entityType === entityType));
    }
    /**
     * Subscribe to events for a specific cluster
     */
    subscribeByCluster(clusterId) {
        return this.eventSubject.pipe((0, operators_1.filter)((e) => e.clusterId === clusterId));
    }
    /**
     * Helper to create and publish common events
     */
    async emitClusterCreated(tenantId, entityType, clusterId, nodeIds, correlationId) {
        await this.publish({
            eventId: (0, uuid_1.v4)(),
            eventType: 'CLUSTER_CREATED',
            tenantId,
            entityType,
            clusterId,
            nodeIds,
            payload: { nodeCount: nodeIds.length },
            timestamp: new Date().toISOString(),
            source: 'er-service',
            correlationId,
        });
    }
    async emitClusterMerged(tenantId, entityType, targetClusterId, sourceClusterId, nodeIds, correlationId) {
        await this.publish({
            eventId: (0, uuid_1.v4)(),
            eventType: 'CLUSTER_MERGED',
            tenantId,
            entityType,
            clusterId: targetClusterId,
            nodeIds,
            payload: {
                sourceClusterId,
                mergedNodeCount: nodeIds.length,
            },
            timestamp: new Date().toISOString(),
            source: 'er-service',
            correlationId,
        });
    }
    async emitClusterSplit(tenantId, entityType, originalClusterId, newClusterIds, correlationId) {
        await this.publish({
            eventId: (0, uuid_1.v4)(),
            eventType: 'CLUSTER_SPLIT',
            tenantId,
            entityType,
            clusterId: originalClusterId,
            payload: { newClusterIds },
            timestamp: new Date().toISOString(),
            source: 'er-service',
            correlationId,
        });
    }
    async emitNodeAdded(tenantId, entityType, clusterId, nodeId, correlationId) {
        await this.publish({
            eventId: (0, uuid_1.v4)(),
            eventType: 'NODE_ADDED',
            tenantId,
            entityType,
            clusterId,
            nodeIds: [nodeId],
            payload: {},
            timestamp: new Date().toISOString(),
            source: 'er-service',
            correlationId,
        });
    }
    async emitReviewRequired(tenantId, entityType, reviewId, nodeAId, nodeBId, matchScore, correlationId) {
        await this.publish({
            eventId: (0, uuid_1.v4)(),
            eventType: 'REVIEW_REQUIRED',
            tenantId,
            entityType,
            nodeIds: [nodeAId, nodeBId],
            payload: { reviewId, matchScore },
            timestamp: new Date().toISOString(),
            source: 'er-service',
            correlationId,
        });
    }
    async emitMatchDecision(tenantId, entityType, nodeAId, nodeBId, decision, score, correlationId) {
        await this.publish({
            eventId: (0, uuid_1.v4)(),
            eventType: 'MATCH_DECISION',
            tenantId,
            entityType,
            nodeIds: [nodeAId, nodeBId],
            payload: { decision, score },
            timestamp: new Date().toISOString(),
            source: 'er-service',
            correlationId,
        });
    }
}
exports.EREventBus = EREventBus;
let eventBus = null;
function initializeEventBus(config) {
    if (eventBus) {
        return eventBus;
    }
    eventBus = new EREventBus(config);
    return eventBus;
}
function getEventBus() {
    if (!eventBus) {
        throw new Error('EventBus not initialized. Call initializeEventBus first.');
    }
    return eventBus;
}
