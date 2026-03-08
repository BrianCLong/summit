"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoherenceSubscriptionManager = exports.subscriptionResolvers = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
const graphql_subscriptions_2 = require("graphql-subscriptions");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class CoherenceSubscriptionManager {
    pubsub;
    redis;
    subscriptionCounts = new Map();
    constructor(redis) {
        this.pubsub = new graphql_subscriptions_1.PubSub();
        this.redis = redis;
        this.setupRedisSubscriptions();
    }
    setupRedisSubscriptions() {
        // Subscribe to Redis channels for cross-instance communication
        const subscriber = this.redis.getClient();
        subscriber.subscribe('coherence:updates');
        subscriber.subscribe('activity:updates');
        subscriber.subscribe('narrative:updates');
        subscriber.on('message', (channel, message) => {
            try {
                const data = JSON.parse(message);
                switch (channel) {
                    case 'coherence:updates':
                        this.pubsub.publish('COHERENCE_UPDATED', data);
                        break;
                    case 'activity:updates':
                        this.pubsub.publish('ACTIVITY_UPDATED', data);
                        break;
                    case 'narrative:updates':
                        this.pubsub.publish('NARRATIVE_UPDATED', data);
                        break;
                }
            }
            catch (error) {
                logger_js_1.default.error('Failed to parse Redis subscription message', {
                    error,
                    channel,
                    message: message.substring(0, 100),
                });
            }
        });
    }
    // Coherence score subscription
    coherenceUpdated() {
        return (0, graphql_subscriptions_2.withFilter)(() => this.pubsub.asyncIterator(['COHERENCE_UPDATED']), (payload, variables) => {
            return payload.tenantId === variables.tenantId;
        });
    }
    // Activity fingerprint subscription
    activityUpdated() {
        return (0, graphql_subscriptions_2.withFilter)(() => this.pubsub.asyncIterator(['ACTIVITY_UPDATED']), (payload, variables) => {
            if (payload.tenantId !== variables.tenantId)
                return false;
            if (variables.activityTypes?.length) {
                return variables.activityTypes.includes(payload.fingerprint.type);
            }
            return true;
        });
    }
    // Narrative impact subscription
    narrativeUpdated() {
        return (0, graphql_subscriptions_2.withFilter)(() => this.pubsub.asyncIterator(['NARRATIVE_UPDATED']), (payload, variables) => {
            if (payload.tenantId !== variables.tenantId)
                return false;
            if (variables.minSeverity) {
                const severityLevels = { low: 1, medium: 2, high: 3 };
                const payloadLevel = severityLevels[payload.severity];
                const minLevel = severityLevels[variables.minSeverity];
                return payloadLevel >= minLevel;
            }
            return true;
        });
    }
    // Combined intelligence feed
    intelligenceUpdated() {
        return (0, graphql_subscriptions_2.withFilter)(() => this.pubsub.asyncIterator([
            'COHERENCE_UPDATED',
            'ACTIVITY_UPDATED',
            'NARRATIVE_UPDATED',
        ]), (payload, variables) => {
            return payload.tenantId === variables.tenantId;
        });
    }
    // Publish methods for triggering subscriptions
    async publishCoherenceUpdate(update) {
        try {
            // Publish locally
            await this.pubsub.publish('COHERENCE_UPDATED', update);
            // Publish to Redis for cross-instance communication
            await this.redis.publish('coherence:updates', JSON.stringify(update));
            logger_js_1.default.debug('Published coherence update', {
                tenantId: update.tenantId,
                changeType: update.changeType,
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to publish coherence update', { error, update });
        }
    }
    async publishActivityUpdate(update) {
        try {
            await this.pubsub.publish('ACTIVITY_UPDATED', update);
            await this.redis.publish('activity:updates', JSON.stringify(update));
            logger_js_1.default.debug('Published activity update', {
                tenantId: update.tenantId,
                activityId: update.activityId,
                changeType: update.changeType,
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to publish activity update', { error, update });
        }
    }
    async publishNarrativeUpdate(update) {
        try {
            await this.pubsub.publish('NARRATIVE_UPDATED', update);
            await this.redis.publish('narrative:updates', JSON.stringify(update));
            logger_js_1.default.debug('Published narrative update', {
                tenantId: update.tenantId,
                narrativeId: update.narrativeId,
                changeType: update.changeType,
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to publish narrative update', { error, update });
        }
    }
    // Subscription lifecycle management
    async onSubscribe(subscriptionName, tenantId) {
        const key = `${subscriptionName}:${tenantId}`;
        const current = this.subscriptionCounts.get(key) || 0;
        this.subscriptionCounts.set(key, current + 1);
        logger_js_1.default.info('Subscription added', {
            subscriptionName,
            tenantId,
            count: current + 1,
        });
        // Store subscription in Redis for monitoring
        await this.redis.hincrby(`subscriptions:${tenantId}`, subscriptionName, 1);
    }
    async onUnsubscribe(subscriptionName, tenantId) {
        const key = `${subscriptionName}:${tenantId}`;
        const current = this.subscriptionCounts.get(key) || 0;
        const newCount = Math.max(0, current - 1);
        if (newCount === 0) {
            this.subscriptionCounts.delete(key);
        }
        else {
            this.subscriptionCounts.set(key, newCount);
        }
        logger_js_1.default.info('Subscription removed', {
            subscriptionName,
            tenantId,
            count: newCount,
        });
        // Update Redis
        if (newCount === 0) {
            await this.redis.hdel(`subscriptions:${tenantId}`, subscriptionName);
        }
        else {
            await this.redis.hincrby(`subscriptions:${tenantId}`, subscriptionName, -1);
        }
    }
    // Health monitoring
    getSubscriptionCounts() {
        return Object.fromEntries(this.subscriptionCounts.entries());
    }
    async getActiveSubscriptionsForTenant(tenantId) {
        const result = await this.redis.hgetall(`subscriptions:${tenantId}`);
        const subscriptions = {};
        for (const [key, value] of Object.entries(result)) {
            subscriptions[key] = parseInt(value, 10) || 0;
        }
        return subscriptions;
    }
    // Utility methods for testing and monitoring
    async simulateCoherenceUpdate(tenantId, overrides = {}) {
        const update = {
            tenantId,
            score: Math.random(),
            status: 'medium',
            signalCount: Math.floor(Math.random() * 100),
            timestamp: new Date().toISOString(),
            changeType: 'score_change',
            metadata: { simulation: true },
            ...overrides,
        };
        await this.publishCoherenceUpdate(update);
        return update;
    }
    async simulateActivityUpdate(tenantId, overrides = {}) {
        const update = {
            tenantId,
            activityId: `activity_${Date.now()}`,
            fingerprint: {
                type: 'user_interaction',
                pattern: 'login_sequence',
                confidence: Math.random(),
            },
            timestamp: new Date().toISOString(),
            confidence: Math.random(),
            changeType: 'new_activity',
            ...overrides,
        };
        await this.publishActivityUpdate(update);
        return update;
    }
    async simulateNarrativeUpdate(tenantId, overrides = {}) {
        const severities = [
            'low',
            'medium',
            'high',
        ];
        const update = {
            tenantId,
            narrativeId: `narrative_${Date.now()}`,
            impact: {
                type: 'information_flow',
                direction: 'upstream',
                magnitude: Math.random(),
            },
            timestamp: new Date().toISOString(),
            severity: severities[Math.floor(Math.random() * severities.length)],
            changeType: 'narrative_shift',
            ...overrides,
        };
        await this.publishNarrativeUpdate(update);
        return update;
    }
}
exports.CoherenceSubscriptionManager = CoherenceSubscriptionManager;
// GraphQL subscription resolvers
exports.subscriptionResolvers = {
    Subscription: {
        coherenceUpdated: {
            subscribe: (parent, args, context) => {
                context.subscriptionManager.onSubscribe('coherenceUpdated', args.tenantId);
                return context.subscriptionManager.coherenceUpdated();
            },
            resolve: (payload) => payload,
        },
        activityUpdated: {
            subscribe: (parent, args, context) => {
                context.subscriptionManager.onSubscribe('activityUpdated', args.tenantId);
                return context.subscriptionManager.activityUpdated();
            },
            resolve: (payload) => payload,
        },
        narrativeUpdated: {
            subscribe: (parent, args, context) => {
                context.subscriptionManager.onSubscribe('narrativeUpdated', args.tenantId);
                return context.subscriptionManager.narrativeUpdated();
            },
            resolve: (payload) => payload,
        },
        intelligenceUpdated: {
            subscribe: (parent, args, context) => {
                context.subscriptionManager.onSubscribe('intelligenceUpdated', args.tenantId);
                return context.subscriptionManager.intelligenceUpdated();
            },
            resolve: (payload) => {
                // Transform different update types into a unified intelligence update format
                return {
                    tenantId: payload.tenantId,
                    timestamp: payload.timestamp,
                    type: 'changeType' in payload ? payload.changeType : 'unknown',
                    data: payload,
                };
            },
        },
    },
};
