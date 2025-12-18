import type { Snapshot } from './types.js';

export interface SnapshotStore<TState = unknown> {
  getLatest(streamId: string): Promise<Snapshot<TState> | null>;
  save(snapshot: Snapshot<TState>): Promise<void>;
}

export class InMemorySnapshotStore<TState = unknown> implements SnapshotStore<TState> {
  private readonly snapshots = new Map<string, Snapshot<TState>>();

  async getLatest(streamId: string): Promise<Snapshot<TState> | null> {
    return this.snapshots.get(streamId) ?? null;
  }

  async save(snapshot: Snapshot<TState>): Promise<void> {
    this.snapshots.set(snapshot.streamId, snapshot);
  }
}
