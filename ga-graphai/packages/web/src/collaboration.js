"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceCollaborationClient = void 0;
class WorkspaceCollaborationClient {
    presences = new Map();
    activities = new Map();
    stalenessMs;
    activityLimit;
    version = 0;
    constructor(options = {}) {
        this.stalenessMs = options.stalenessMs ?? 60_000;
        this.activityLimit = options.activityLimit ?? 50;
    }
    ingestSync(state) {
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
    presenceIndicators(now = Date.now()) {
        return [...this.presences.values()].map((presence) => {
            const isStale = now - presence.lastSeen > this.stalenessMs;
            const status = isStale ? 'offline' : presence.status;
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
    activityStream(limit = 15) {
        return [...this.activities.values()]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    trimActivities() {
        if (this.activities.size <= this.activityLimit) {
            return;
        }
        const ordered = [...this.activities.values()].sort((a, b) => b.timestamp - a.timestamp);
        const trimmed = ordered.slice(0, this.activityLimit);
        this.activities.clear();
        for (const activity of trimmed) {
            this.activities.set(activity.id, activity);
        }
    }
}
exports.WorkspaceCollaborationClient = WorkspaceCollaborationClient;
