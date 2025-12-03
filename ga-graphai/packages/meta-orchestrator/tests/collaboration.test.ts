import type { WorkspaceAnalyst, WorkspaceSyncState } from '@ga-graphai/common-types';
import { describe, expect, it } from 'vitest';

import { CollaborativeWorkspace } from '../src/index.js';

const leadAnalyst: WorkspaceAnalyst = {
  id: 'analyst-1',
  displayName: 'Lead Analyst',
  role: 'lead',
};

const supportingAnalyst: WorkspaceAnalyst = {
  id: 'analyst-2',
  displayName: 'Supporting Analyst',
  role: 'collaborator',
};

describe('CollaborativeWorkspace', () => {
  it('applies updates and surfaces conflicts from stale writers', () => {
    const workspace = new CollaborativeWorkspace('intel-workspace');

    const initial = workspace.applyUpdate({
      workspaceId: 'intel-workspace',
      baseVersion: 0,
      timestamp: 1_000,
      summary: 'Seed collaborative hypothesis',
      changes: { hypothesis: 'alpha', priority: 'high' },
      author: leadAnalyst,
    });

    expect(initial.version).toBeGreaterThan(0);
    expect(initial.entries.find((entry) => entry.key === 'hypothesis')?.value).toBe('alpha');

    const stale = workspace.applyUpdate({
      workspaceId: 'intel-workspace',
      baseVersion: 0,
      timestamp: 2_000,
      summary: 'Stale overwrite attempt',
      changes: { hypothesis: 'beta' },
      author: supportingAnalyst,
    });

    expect(stale.conflicts?.[0].resolvedWith).toBe('local');
    expect(stale.entries.find((entry) => entry.key === 'hypothesis')?.value).toBe('alpha');
    expect(stale.activities.some((activity) => activity.type === 'conflict')).toBe(true);
  });

  it('merges sync state while keeping the freshest presence and activities', () => {
    const workspace = new CollaborativeWorkspace('intel-workspace', { activityLimit: 5 });

    workspace.recordPresence({
      analyst: leadAnalyst,
      status: 'active',
      lastSeen: 1_000,
      focus: 'timeline',
    });

    const remoteSync: WorkspaceSyncState = {
      workspaceId: 'intel-workspace',
      version: 3,
      entries: [
        {
          key: 'hypothesis',
          value: 'gamma',
          version: 3,
          updatedAt: 3_000,
          updatedBy: supportingAnalyst,
        },
      ],
      presences: [
        {
          analyst: supportingAnalyst,
          status: 'active',
          lastSeen: 2_000,
          focus: 'graph',
          activity: 'labeling nodes',
        },
        { analyst: leadAnalyst, status: 'idle', lastSeen: 900, focus: 'timeline' },
      ],
      activities: [
        {
          id: 'activity-1',
          type: 'update',
          actor: supportingAnalyst,
          timestamp: 3_000,
          description: 'remote refinement',
          relatedKeys: ['hypothesis'],
          version: 3,
        },
      ],
    };

    const merged = workspace.mergeSyncState(remoteSync);

    const peerPresence = merged.presences.find(
      (presence) => presence.analyst.id === supportingAnalyst.id,
    );
    expect(peerPresence?.focus).toBe('graph');
    expect(merged.activities[0].id).toBe('activity-1');
    expect(merged.entries.find((entry) => entry.key === 'hypothesis')?.value).toBe('gamma');
  });
});
