/**
 * Event Bus
 *
 * Publishes ER events to Kafka for Graph Core and other consumers.
 */

import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import pino from 'pino';
import type { EREvent, EREventType, EntityType } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ name: 'EREventBus' });

export interface EventBusConfig {
  brokers: string[];
  clientId: string;
  topic: string;
  groupId?: string;
}

export class EREventBus {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private eventSubject = new Subject<EREvent>();
  private topic: string;
  private connected = false;

  constructor(config: EventBusConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: config.groupId ?? `${config.clientId}-group`,
    });
    this.topic = config.topic;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await this.producer.connect();
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (message.value) {
            try {
              const event = JSON.parse(message.value.toString()) as EREvent;
              this.eventSubject.next(event);
            } catch (error) {
              logger.error({ error, message: message.value.toString() }, 'Failed to parse event');
            }
          }
        },
      });

      this.connected = true;
      logger.info({ topic: this.topic }, 'EventBus connected to Kafka');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Kafka');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    await this.producer.disconnect();
    await this.consumer.disconnect();
    this.connected = false;
    logger.info('EventBus disconnected from Kafka');
  }

  /**
   * Publish an event
   */
  async publish(event: EREvent): Promise<void> {
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

    logger.debug(
      { eventId: event.eventId, eventType: event.eventType },
      'Event published'
    );
  }

  /**
   * Subscribe to all events
   */
  subscribe(): Observable<EREvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * Subscribe to events by type
   */
  subscribeByType(eventType: EREventType): Observable<EREvent> {
    return this.eventSubject.pipe(filter((e) => e.eventType === eventType));
  }

  /**
   * Subscribe to events by entity type
   */
  subscribeByEntityType(entityType: EntityType): Observable<EREvent> {
    return this.eventSubject.pipe(filter((e) => e.entityType === entityType));
  }

  /**
   * Subscribe to events for a specific cluster
   */
  subscribeByCluster(clusterId: string): Observable<EREvent> {
    return this.eventSubject.pipe(filter((e) => e.clusterId === clusterId));
  }

  /**
   * Helper to create and publish common events
   */
  async emitClusterCreated(
    tenantId: string,
    entityType: EntityType,
    clusterId: string,
    nodeIds: string[],
    correlationId?: string
  ): Promise<void> {
    await this.publish({
      eventId: uuidv4(),
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

  async emitClusterMerged(
    tenantId: string,
    entityType: EntityType,
    targetClusterId: string,
    sourceClusterId: string,
    nodeIds: string[],
    correlationId?: string
  ): Promise<void> {
    await this.publish({
      eventId: uuidv4(),
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

  async emitClusterSplit(
    tenantId: string,
    entityType: EntityType,
    originalClusterId: string,
    newClusterIds: string[],
    correlationId?: string
  ): Promise<void> {
    await this.publish({
      eventId: uuidv4(),
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

  async emitNodeAdded(
    tenantId: string,
    entityType: EntityType,
    clusterId: string,
    nodeId: string,
    correlationId?: string
  ): Promise<void> {
    await this.publish({
      eventId: uuidv4(),
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

  async emitReviewRequired(
    tenantId: string,
    entityType: EntityType,
    reviewId: string,
    nodeAId: string,
    nodeBId: string,
    matchScore: number,
    correlationId?: string
  ): Promise<void> {
    await this.publish({
      eventId: uuidv4(),
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

  async emitMatchDecision(
    tenantId: string,
    entityType: EntityType,
    nodeAId: string,
    nodeBId: string,
    decision: string,
    score: number,
    correlationId?: string
  ): Promise<void> {
    await this.publish({
      eventId: uuidv4(),
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

let eventBus: EREventBus | null = null;

export function initializeEventBus(config: EventBusConfig): EREventBus {
  if (eventBus) {
    return eventBus;
  }
  eventBus = new EREventBus(config);
  return eventBus;
}

export function getEventBus(): EREventBus {
  if (!eventBus) {
    throw new Error('EventBus not initialized. Call initializeEventBus first.');
  }
  return eventBus;
}
