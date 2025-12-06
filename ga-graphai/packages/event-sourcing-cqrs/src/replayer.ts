import type { EventStore } from './eventStore.js';
import type { SnapshotStore } from './snapshotStore.js';
import type { Projection } from './queryModel.js';
import type { EventEnvelope } from './types.js';

export interface ReplayOptions {
  streamId: string;
  projection: Projection<unknown>;
  snapshotStore?: SnapshotStore;
}

export class EventReplayer {
  constructor(private readonly eventStore: EventStore) {}

  async replay({ streamId, projection, snapshotStore }: ReplayOptions): Promise<void> {
    const snapshot = snapshotStore ? await snapshotStore.getLatest(streamId) : null;
    let fromVersion = 0;

    if (snapshot) {
      projection.apply({
        id: 'snapshot',
        streamId,
        version: snapshot.version,
        timestamp: snapshot.takenAt,
        event: { type: 'snapshot', payload: snapshot.state },
      });
      fromVersion = snapshot.version + 1;
    }

    const events: EventEnvelope[] = await this.eventStore.loadStream(
      streamId,
      fromVersion,
    );
    for (const event of events) {
      projection.apply(event);
    }
  }
}
