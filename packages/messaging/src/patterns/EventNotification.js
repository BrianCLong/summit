"use strict";
/**
 * EventNotification - Event notification pattern
 *
 * Domain events with flexible subscription and filtering
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventNotificationService = void 0;
const events_1 = require("events");
const pino_1 = __importDefault(require("pino"));
class EventNotificationService extends events_1.EventEmitter {
    eventBus;
    logger;
    subscriptions = new Map();
    constructor(eventBus) {
        super();
        this.eventBus = eventBus;
        this.logger = (0, pino_1.default)({ name: 'EventNotificationService' });
    }
    /**
     * Publish domain event notification
     */
    async publish(event) {
        this.logger.debug({ eventId: event.eventId, eventType: event.eventType }, 'Publishing event notification');
        // Publish to general events topic
        await this.eventBus.publish('domain.events', event);
        // Publish to event-type specific topic
        await this.eventBus.publish(`domain.events.${event.eventType}`, event);
        // Publish to aggregate-type specific topic
        await this.eventBus.publish(`domain.events.${event.aggregateType}`, event);
        this.emit('event:published', event);
    }
    /**
     * Subscribe to events with optional filter
     */
    async subscribe(subscriber, filter) {
        const subscriptionId = `sub-${Date.now()}-${Math.random()}`;
        this.subscriptions.set(subscriptionId, {
            filter,
            subscriber: subscriber
        });
        // Subscribe to general events topic
        await this.eventBus.subscribe('domain.events', async (message) => {
            const event = message.payload;
            if (this.matchesFilter(event, filter)) {
                try {
                    await subscriber(event);
                }
                catch (err) {
                    this.logger.error({ err, eventId: event.eventId }, 'Subscriber error');
                    this.emit('subscriber:error', { event, error: err });
                }
            }
        });
        this.logger.info({ subscriptionId, filter }, 'Subscription created');
        return subscriptionId;
    }
    /**
     * Subscribe to specific event types
     */
    async subscribeToEventTypes(eventTypes, subscriber) {
        return this.subscribe(subscriber, { eventTypes });
    }
    /**
     * Subscribe to specific aggregate types
     */
    async subscribeToAggregateTypes(aggregateTypes, subscriber) {
        return this.subscribe(subscriber, { aggregateTypes });
    }
    /**
     * Subscribe to specific aggregate instances
     */
    async subscribeToAggregates(aggregateIds, subscriber) {
        return this.subscribe(subscriber, { aggregateIds });
    }
    /**
     * Check if event matches filter
     */
    matchesFilter(event, filter) {
        if (!filter)
            return true;
        if (!filter) {
            return true;
        }
        if (filter.eventTypes &&
            !filter.eventTypes.includes(event.eventType)) {
            return false;
        }
        if (filter.aggregateTypes &&
            !filter.aggregateTypes.includes(event.aggregateType)) {
            return false;
        }
        if (filter.aggregateIds &&
            !filter.aggregateIds.includes(event.aggregateId)) {
            return false;
        }
        return true;
    }
    /**
     * Unsubscribe
     */
    async unsubscribe(subscriptionId) {
        this.subscriptions.delete(subscriptionId);
        this.logger.info({ subscriptionId }, 'Unsubscribed');
    }
    /**
     * Get subscription count
     */
    getSubscriptionCount() {
        return this.subscriptions.size;
    }
}
exports.EventNotificationService = EventNotificationService;
