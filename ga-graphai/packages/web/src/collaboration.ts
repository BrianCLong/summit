import type {
  PresenceStatus,
  WorkspaceActivity,
  WorkspacePresence,
  WorkspaceSyncState,
} from 'common-types';

export interface PresenceIndicator {
  analystId: string;
  displayName: string;
  status: PresenceStatus;
  focus?: string;
  lastSeen: number;
  isStale: boolean;
  activity?: string;
}

export interface WorkspaceCollaborationOptions {
  stalenessMs?: number;
  activityLimit?: number;
}

export class WorkspaceCollaborationClient {
  private readonly presences = new Map<string, WorkspacePresence>();
  private readonly activities = new Map<string, WorkspaceActivity>();
  private readonly stalenessMs: number;
  private readonly activityLimit: number;

  private version = 0;

  constructor(options: WorkspaceCollaborationOptions = {}) {
    this.stalenessMs = options.stalenessMs ?? 60_000;
    this.activityLimit = options.activityLimit ?? 50;
  }

  ingestSync(state: WorkspaceSyncState): void {
    if (state.version < this.version) {
      return;
    }

    this.version = state.version;

    for (const presence of state.presences) {
      const existing = this.presences.get(presence.analyst.id);
      if (!existing || presence.lastSeen >= existing.lastSeen) {
        this.presences.set(presence.analyst.id, presence);
      }
    }

    for (const activity of state.activities) {
      this.activities.set(activity.id, activity);
    }

    this.trimActivities();
  }

  presenceIndicators(now = Date.now()): PresenceIndicator[] {
    return [...this.presences.values()].map((presence) => {
      const isStale = now - presence.lastSeen > this.stalenessMs;
      const status: PresenceStatus = isStale ? 'offline' : presence.status;
      return {
        analystId: presence.analyst.id,
        displayName: presence.analyst.displayName,
        status,
        focus: presence.focus,
        lastSeen: presence.lastSeen,
        isStale,
        activity: presence.activity,
      };
    });
  }

  activityStream(limit = 15): WorkspaceActivity[] {
    return [...this.activities.values()]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  private trimActivities(): void {
    if (this.activities.size <= this.activityLimit) {
      return;
    }

    const ordered = [...this.activities.values()].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    const trimmed = ordered.slice(0, this.activityLimit);
    this.activities.clear();
    for (const activity of trimmed) {
      this.activities.set(activity.id, activity);
    }
  }
}
