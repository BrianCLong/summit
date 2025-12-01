import type { WorkspaceSyncState } from 'common-types';
import { describe, expect, it } from 'vitest';

import { WorkspaceCollaborationClient } from '../src/collaboration.js';

describe('WorkspaceCollaborationClient', () => {
  it('prefers newer sync payloads and flags stale presences', () => {
    const client = new WorkspaceCollaborationClient({ stalenessMs: 800, activityLimit: 2 });

    const initial: WorkspaceSyncState = {
      workspaceId: 'intel-workspace',
      version: 1,
      entries: [],
      presences: [
        {
          analyst: { id: 'analyst-1', displayName: 'Analyst One' },
          status: 'active',
          lastSeen: 1_000,
          focus: 'graph',
        },
      ],
      activities: [
        {
          id: 'activity-1',
          type: 'update',
          actor: { id: 'analyst-1', displayName: 'Analyst One' },
          timestamp: 900,
          description: 'seed update',
        },
      ],
    };

    client.ingestSync(initial);
    const staleIndicators = client.presenceIndicators(1_900);
    expect(staleIndicators[0].isStale).toBe(true);
    expect(staleIndicators[0].status).toBe('offline');

    const newer: WorkspaceSyncState = {
      workspaceId: 'intel-workspace',
      version: 2,
      entries: [],
      presences: [
        {
          analyst: { id: 'analyst-1', displayName: 'Analyst One' },
          status: 'active',
          lastSeen: 1_700,
          focus: 'timeline',
        },
        {
          analyst: { id: 'analyst-2', displayName: 'Analyst Two' },
          status: 'idle',
          lastSeen: 1_600,
          activity: 'reviewing notes',
        },
      ],
      activities: [
        {
          id: 'activity-2',
          type: 'presence',
          actor: { id: 'analyst-2', displayName: 'Analyst Two' },
          timestamp: 1_650,
          description: 'joined workspace',
        },
        {
          id: 'activity-3',
          type: 'update',
          actor: { id: 'analyst-1', displayName: 'Analyst One' },
          timestamp: 1_800,
          description: 'refined hypothesis',
          relatedKeys: ['hypothesis'],
        },
      ],
    };

    client.ingestSync(newer);

    const indicators = client.presenceIndicators(1_900);
    const refreshed = indicators.find((presence) => presence.analystId === 'analyst-1');
    expect(refreshed?.status).toBe('active');
    expect(refreshed?.focus).toBe('timeline');

    const stream = client.activityStream();
    expect(stream).toHaveLength(2);
    expect(stream[0].id).toBe('activity-3');
    expect(stream.at(-1)?.id).toBe('activity-2');
  });
});
