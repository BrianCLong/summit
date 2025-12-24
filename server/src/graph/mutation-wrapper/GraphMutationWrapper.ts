
import { eventLog } from '../../events/EventLog';
import { EventType } from '../../events/types';
import { GraphStore } from '../store'; // Assuming existing GraphStore

export class GraphMutationWrapper {
  constructor(private store: GraphStore) {}

  /**
   * Wraps upsertNode with event logging.
   */
  async upsertNode(
    actorId: string,
    node: any
  ): Promise<void> {
    const tenantId = node.tenantId;
    const globalId = node.globalId;

    // 1. Fetch current state (before)
    const before = await this.store.getNode(globalId, tenantId);

    // 2. Perform Mutation
    await this.store.upsertNode(node);

    // 3. Fetch new state (after)
    // In a real optimized system, we might compute 'after' from input or return it from upsert.
    // Here we re-fetch to be sure.
    const after = await this.store.getNode(globalId, tenantId);

    // 4. Log Event
    const type = before ? EventType.NODE_UPDATED : EventType.NODE_CREATED;

    await eventLog.append(
        type,
        tenantId,
        actorId,
        globalId,
        'node',
        before,
        after
    );
  }

  // Similar wrapper would exist for edges...
}
