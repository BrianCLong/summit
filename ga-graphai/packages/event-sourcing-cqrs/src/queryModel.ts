import type { EventEnvelope, ProjectionHandler, ProjectionState } from './types.js';

export interface Projection<TState> {
  get(): ProjectionState<TState>;
  apply(envelope: EventEnvelope): void;
}

export class InMemoryProjection<TState> implements Projection<TState> {
  private readonly handler: ProjectionHandler<TState>;
  private state: ProjectionState<TState>;

  constructor(initialState: TState, handler: ProjectionHandler<TState>) {
    this.handler = handler;
    this.state = {
      state: initialState,
      version: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  get(): ProjectionState<TState> {
    return this.state;
  }

  apply(envelope: EventEnvelope): void {
    this.state = {
      state: this.handler(this.state.state, envelope),
      version: envelope.version,
      updatedAt: new Date().toISOString(),
    };
  }
}

export class ProjectionRegistry {
  private readonly projections = new Map<string, Projection<unknown>>();

  register<TState>(id: string, projection: Projection<TState>): void {
    this.projections.set(id, projection);
  }

  get<TState>(id: string): Projection<TState> | undefined {
    return this.projections.get(id) as Projection<TState> | undefined;
  }

  applyAll(envelope: EventEnvelope): void {
    for (const projection of this.projections.values()) {
      projection.apply(envelope);
    }
  }
}
