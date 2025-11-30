/**
 * Event Sourcing - Core Types
 *
 * Type definitions for event sourcing framework
 */

export interface DomainEvent<T = any> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  payload: T;
  metadata?: EventMetadata;
  causationId?: string;
  correlationId?: string;
}

export interface EventMetadata {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
  spanId?: string;
  tags?: Record<string, string>;
}

export interface EventDescriptor {
  aggregateId: string;
  aggregateType: string;
  version: number;
}

export interface EventStream {
  aggregateId: string;
  aggregateType: string;
  events: DomainEvent[];
  version: number;
}

export interface EventFilter {
  aggregateType?: string;
  aggregateIds?: string[];
  eventTypes?: string[];
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
}

export interface EventStoreConfig {
  connectionString: string;
  schema?: string;
  batchSize?: number;
  snapshotInterval?: number;
}

export interface Snapshot<T = any> {
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  state: T;
}

export interface AggregateRoot<T = any> {
  id: string;
  type: string;
  version: number;
  state: T;
  uncommittedEvents: DomainEvent[];
}

export interface EventUpcaster {
  fromVersion: number;
  toVersion: number;
  upcast: (event: DomainEvent) => DomainEvent;
}

export interface ReplayOptions {
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  batchSize?: number;
}

export interface EventStoreStats {
  totalEvents: number;
  totalAggregates: number;
  eventsByType: Record<string, number>;
  averageEventsPerAggregate: number;
  oldestEvent?: Date;
  newestEvent?: Date;
}
