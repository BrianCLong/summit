"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborativeWorkspace = exports.CollaborativeContextBroker = void 0;
const utils_js_1 = require("./utils.js");
class CollaborativeContextBroker {
    tokenLimit;
    tokenEstimator;
    context = new Map();
    constructor(options) {
        this.tokenLimit = options.tokenLimitPerSync;
        this.tokenEstimator = options.tokenEstimator ?? utils_js_1.defaultTokenEstimator;
    }
    upsert(state) {
        this.context.set(state.id, state);
    }
    getSnapshot() {
        return [...this.context.values()].sort((a, b) => a.lastUpdated - b.lastUpdated);
    }
    diffSince(timestamp) {
        const diffs = [];
        let usedTokens = 0;
        for (const state of this.getSnapshot()) {
            if (state.lastUpdated <= timestamp) {
                continue;
            }
            const estimate = this.tokenEstimator(state.content);
            if (usedTokens + estimate > this.tokenLimit) {
                break;
            }
            diffs.push({ id: state.id, content: state.content, tokenEstimate: estimate });
            usedTokens += estimate;
        }
        return diffs;
    }
    assignAgents(agents, basePrompt, timestamp) {
        const diffs = this.diffSince(timestamp);
        const assignments = [];
        for (let index = 0; index < agents.length; index += 1) {
            const diff = diffs[index];
            const prompt = diff
                ? `${basePrompt}\n\nContext update (${diff.id}):\n${diff.content}`
                : basePrompt;
            assignments.push({ agent: agents[index], prompt });
        }
        return assignments;
    }
}
exports.CollaborativeContextBroker = CollaborativeContextBroker;
class CollaborativeWorkspace {
    workspaceId;
    entries = new Map();
    presences = new Map();
    activities = new Map();
    activityLimit;
    version = 0;
    constructor(workspaceId, options = {}) {
        this.workspaceId = workspaceId;
        this.activityLimit = options.activityLimit ?? 50;
    }
    applyUpdate(update) {
        const appliedAt = update.timestamp ?? Date.now();
        const targetVersion = Math.max(this.version + 1, update.baseVersion + 1);
        const conflicts = [];
        const appliedKeys = [];
        for (const [key, value] of Object.entries(update.changes)) {
            const local = this.entries.get(key);
            if (local && local.version > update.baseVersion) {
                conflicts.push({
                    key,
                    localVersion: local.version,
                    incomingVersion: targetVersion,
                    resolvedWith: 'local',
                    note: `local edit from ${local.updatedBy.displayName} is newer`,
                    lastKnownBy: local.updatedBy,
                    incomingAuthor: update.author,
                });
                continue;
            }
            const entry = {
                key,
                value,
                version: targetVersion,
                updatedAt: appliedAt,
                updatedBy: update.author,
            };
            this.entries.set(key, entry);
            appliedKeys.push(key);
        }
        this.version = Math.max(this.version, targetVersion);
        if (appliedKeys.length > 0) {
            this.appendActivity({
                id: `${this.workspaceId}:update:${targetVersion}:${appliedAt}`,
                type: 'update',
                actor: update.author,
                timestamp: appliedAt,
                description: update.summary,
                relatedKeys: appliedKeys,
                version: this.version,
            });
        }
        if (conflicts.length > 0) {
            this.appendActivity({
                id: `${this.workspaceId}:conflict:${targetVersion}:${conflicts.length}`,
                type: 'conflict',
                actor: update.author,
                timestamp: Date.now(),
                description: `Conflicts detected for ${conflicts.length} keys`,
                relatedKeys: conflicts.map((conflict) => conflict.key),
                version: this.version,
            });
        }
        return this.snapshot(conflicts);
    }
    recordPresence(presence) {
        const existing = this.presences.get(presence.analyst.id);
        const merged = {
            ...presence,
            lastSeen: Math.max(presence.lastSeen, existing?.lastSeen ?? 0),
            focus: presence.focus ?? existing?.focus,
            activity: presence.activity ?? existing?.activity,
        };
        this.presences.set(presence.analyst.id, merged);
        if (!existing ||
            existing.status !== merged.status ||
            existing.focus !== merged.focus ||
            existing.activity !== merged.activity) {
            this.appendActivity({
                id: `${this.workspaceId}:presence:${presence.analyst.id}:${merged.lastSeen}`,
                type: 'presence',
                actor: presence.analyst,
                timestamp: merged.lastSeen,
                description: `${presence.analyst.displayName} is ${merged.status}`,
                relatedKeys: merged.focus ? [merged.focus] : undefined,
                version: this.version,
            });
            this.version += 1;
        }
        return this.snapshot();
    }
    mergeSyncState(state) {
        const conflicts = [];
        for (const entry of state.entries) {
            const local = this.entries.get(entry.key);
            if (local && local.version > entry.version) {
                conflicts.push({
                    key: entry.key,
                    localVersion: local.version,
                    incomingVersion: entry.version,
                    resolvedWith: 'local',
                    note: 'local state is newer than synced entry',
                    lastKnownBy: local.updatedBy,
                    incomingAuthor: entry.updatedBy,
                });
                continue;
            }
            this.entries.set(entry.key, entry);
        }
        for (const presence of state.presences) {
            const existing = this.presences.get(presence.analyst.id);
            if (!existing || presence.lastSeen >= existing.lastSeen) {
                this.presences.set(presence.analyst.id, presence);
            }
        }
        for (const activity of state.activities) {
            this.appendActivity(activity);
        }
        this.version = Math.max(this.version, state.version);
        if (conflicts.length > 0) {
            this.appendActivity({
                id: `${this.workspaceId}:sync:${this.version}:conflicts`,
                type: 'conflict',
                actor: conflicts[0].incomingAuthor,
                timestamp: Date.now(),
                description: `Sync resolved ${conflicts.length} conflicts`,
                relatedKeys: conflicts.map((conflict) => conflict.key),
                version: this.version,
            });
        }
        else {
            this.appendActivity({
                id: `${this.workspaceId}:sync:${this.version}`,
                type: 'sync',
                actor: state.activities[0]?.actor ?? state.presences[0]?.analyst ?? {
                    id: 'system',
                    displayName: 'System',
                },
                timestamp: Date.now(),
                description: 'Workspace synchronized',
                version: this.version,
            });
        }
        return this.snapshot(conflicts);
    }
    getSnapshot() {
        return this.snapshot();
    }
    appendActivity(activity) {
        this.activities.set(activity.id, activity);
        const ordered = [...this.activities.values()].sort((a, b) => b.timestamp - a.timestamp);
        if (ordered.length > this.activityLimit) {
            const trimmed = ordered.slice(0, this.activityLimit);
            this.activities.clear();
            for (const item of trimmed) {
                this.activities.set(item.id, item);
            }
        }
    }
    snapshot(conflicts = []) {
        const activities = [...this.activities.values()].sort((a, b) => b.timestamp - a.timestamp);
        return {
            workspaceId: this.workspaceId,
            version: this.version,
            entries: [...this.entries.values()].sort((a, b) => a.key.localeCompare(b.key)),
            presences: [...this.presences.values()].sort((a, b) => a.analyst.displayName.localeCompare(b.analyst.displayName)),
            activities,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
        };
    }
}
exports.CollaborativeWorkspace = CollaborativeWorkspace;
