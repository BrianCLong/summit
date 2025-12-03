/**
 * @intelgraph/event-bus
 *
 * Enterprise-grade distributed event bus with pub-sub, queuing, and message routing
 */

export { EventBus } from './core/EventBus.js';
export { MessageRouter, TopicMatcher } from './routing/MessageRouter.js';
export type { RoutingRule } from './routing/MessageRouter.js';
export { DeliveryManager } from './delivery/DeliveryManager.js';
export type { DeliveryRecord } from './delivery/DeliveryManager.js';
export { DeadLetterQueue } from './dlq/DeadLetterQueue.js';
export type { DLQMessage, DLQStats } from './dlq/DeadLetterQueue.js';
export { EventCatalog } from './catalog/EventCatalog.js';
export type { EventSchema, EventTypeMetadata } from './catalog/EventCatalog.js';

export type {
  Message,
  MessageMetadata,
  MessageEnvelope,
  MessageHandler,
  MessageFilter,
  Subscription,
  SubscriptionOptions,
  PublishOptions,
  EventBusConfig,
  EventBusMetrics,
  TopicStats,
  QueueStats,
  DeliveryGuarantee,
  MessageStatus
} from './core/types.js';
