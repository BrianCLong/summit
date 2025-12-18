export type DomainEvent = {
  type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export interface EventEnvelope {
  id: string;
  streamId: string;
  version: number;
  timestamp: string;
  event: DomainEvent;
  correlationId?: string;
  causationId?: string;
}

export interface Command<TPayload = Record<string, unknown>> {
  type: string;
  streamId: string;
  payload: TPayload;
  expectedVersion?: number;
  metadata?: Record<string, unknown>;
}

export interface Snapshot<TState = unknown> {
  streamId: string;
  version: number;
  state: TState;
  takenAt: string;
}

export interface ProjectionState<TState = unknown> {
  state: TState;
  version: number;
  updatedAt: string;
}

export interface SagaState<TData = Record<string, unknown>> {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  data: TData;
  updatedAt: string;
  lastEventId?: string;
}

export type EventHandler = (envelope: EventEnvelope) => void | Promise<void>;

export type ProjectionHandler<TState> = (
  state: TState,
  envelope: EventEnvelope,
) => TState;
