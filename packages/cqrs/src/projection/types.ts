/**
 * CQRS Projection Types
 */

import type { DomainEvent } from '@intelgraph/event-sourcing';

export interface Projection {
  name: string;
  version: number;
  eventHandlers: Map<string, ProjectionEventHandler>;
  initialize?: () => Promise<void>;
  rebuild?: () => Promise<void>;
}

export type ProjectionEventHandler = (
  event: DomainEvent
) => Promise<void> | void;

export interface ProjectionState {
  projectionName: string;
  lastEventId?: string;
  lastEventTimestamp?: Date;
  lastProcessedVersion?: number;
  position: number;
  status: ProjectionStatus;
  error?: string;
}

export enum ProjectionStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  REBUILDING = 'rebuilding',
  ERROR = 'error'
}

export interface ProjectionOptions {
  batchSize?: number;
  pollInterval?: number;
  autoStart?: boolean;
}

export interface ProjectionStats {
  projectionName: string;
  status: ProjectionStatus;
  eventsProcessed: number;
  lastEventTimestamp?: Date;
  processingRate: number;
  lag?: number;
}
