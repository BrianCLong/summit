/**
 * Complex Event Processing Types
 */

import type { StreamMessage } from '@intelgraph/stream-processing';

export interface Event extends StreamMessage {
  eventType: string;
  eventId: string;
  eventSource: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  priority?: number;
  metadata?: Record<string, any>;
  enrichedData?: Record<string, any>;
}

export interface EventPattern {
  id: string;
  name: string;
  description: string;
  conditions: EventCondition[];
  windowConfig?: WindowConfig;
  action?: EventAction;
}

export interface EventCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'regex' | 'exists';
  value?: any;
  eventType?: string;
}

export interface WindowConfig {
  type: 'tumbling' | 'sliding' | 'session';
  size: number; // milliseconds
  slide?: number; // milliseconds (for sliding windows)
  gap?: number; // milliseconds (for session windows)
}

export interface EventAction {
  type: 'alert' | 'aggregate' | 'forward' | 'trigger' | 'custom';
  config: Record<string, any>;
  handler?: (events: Event[]) => Promise<void>;
}

export interface EventSequence {
  id: string;
  pattern: EventPattern;
  events: Event[];
  startTime: number;
  endTime?: number;
  matched: boolean;
}

export interface TemporalRelation {
  type: 'before' | 'after' | 'during' | 'overlaps' | 'meets' | 'starts' | 'finishes' | 'equals';
  event1: string;
  event2: string;
  maxTimeDiff?: number;
}

export interface AggregationConfig {
  groupBy: string[];
  aggregations: {
    field: string;
    function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'stddev' | 'percentile';
    percentile?: number;
  }[];
  window?: WindowConfig;
}

export interface EnrichmentRule {
  id: string;
  eventType: string;
  enrichmentType: 'lookup' | 'api' | 'geo' | 'custom';
  config: Record<string, any>;
  handler?: (event: Event) => Promise<Record<string, any>>;
}

export interface TransformationRule {
  id: string;
  eventType?: string;
  transformations: {
    field: string;
    operation: 'rename' | 'convert' | 'extract' | 'mask' | 'remove' | 'add';
    config: Record<string, any>;
  }[];
}

export interface FilterRule {
  id: string;
  conditions: EventCondition[];
  action: 'include' | 'exclude';
}

export interface CorrelationRule {
  id: string;
  name: string;
  eventTypes: string[];
  correlationKey: string;
  timeWindow: number;
  minEvents: number;
  maxEvents?: number;
}

export interface Alert {
  id: string;
  timestamp: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  events: Event[];
  pattern?: EventPattern;
  metadata?: Record<string, any>;
}
