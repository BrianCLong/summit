"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentStateReconciler = void 0;
const uuid_1 = require("uuid");
const config_1 = require("./config");
class ConsentStateReconciler {
    state = {};
    snapshots = new Map();
    processedRecordIds = new Set();
    precedence;
    constructor(precedence = config_1.defaultSourcePrecedence) {
        this.precedence = precedence;
    }
    ingest(records) {
        const sorted = [...records].sort((a, b) => {
            if (a.subjectId !== b.subjectId) {
                return a.subjectId.localeCompare(b.subjectId);
            }
            if (a.consentType !== b.consentType) {
                return a.consentType.localeCompare(b.consentType);
            }
            const tsDelta = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            if (tsDelta !== 0) {
                return tsDelta;
            }
            return a.recordId.localeCompare(b.recordId);
        });
        const beforeSnapshotId = this.captureSnapshot();
        const proofs = [];
        for (const record of sorted) {
            const normalizedType = record.consentType.toLowerCase();
            const normalizedSource = record.source.toLowerCase();
            const priority = (0, config_1.sourcePriority)(normalizedSource, this.precedence);
            const incomingDecision = {
                recordId: record.recordId,
                status: record.status,
                source: normalizedSource,
                timestamp: record.timestamp,
                priority
            };
            const subjectState = this.ensureSubjectState(record.subjectId);
            const existingDecision = subjectState[normalizedType];
            if (this.processedRecordIds.has(record.recordId)) {
                const proof = this.buildProof(record, existingDecision ?? null, existingDecision ?? incomingDecision, 'duplicate-suppressed', [incomingDecision, ...(existingDecision ? [existingDecision] : [])]);
                proofs.push(proof);
                continue;
            }
            const resolution = this.resolveDecision(existingDecision, incomingDecision);
            const afterDecision = resolution.decision;
            if (resolution.changed) {
                subjectState[normalizedType] = { ...afterDecision };
            }
            this.processedRecordIds.add(record.recordId);
            const proof = this.buildProof(record, existingDecision ?? null, afterDecision, resolution.rule, [incomingDecision, ...(existingDecision ? [existingDecision] : [])]);
            proofs.push(proof);
        }
        const afterSnapshotId = this.captureSnapshot();
        return {
            proofs,
            beforeSnapshotId,
            afterSnapshotId
        };
    }
    diff(snapshotId) {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) {
            throw new Error(`Snapshot ${snapshotId} not found`);
        }
        const entries = [];
        const subjects = new Set([...Object.keys(snapshot.state), ...Object.keys(this.state)]);
        for (const subjectId of subjects) {
            const snapshotState = snapshot.state[subjectId] ?? {};
            const currentState = this.state[subjectId] ?? {};
            const consentTypes = new Set([...Object.keys(snapshotState), ...Object.keys(currentState)]);
            for (const consentType of consentTypes) {
                const beforeDecision = snapshotState[consentType] ?? null;
                const afterDecision = currentState[consentType] ?? null;
                if (!this.areDecisionsEqual(beforeDecision, afterDecision)) {
                    entries.push({ subjectId, consentType, before: beforeDecision, after: afterDecision });
                }
            }
        }
        return {
            snapshotId,
            createdAt: snapshot.createdAt,
            entries
        };
    }
    rollback(snapshotId) {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) {
            throw new Error(`Snapshot ${snapshotId} not found`);
        }
        this.state = this.cloneState(snapshot.state);
        const restoredSnapshot = {
            id: snapshotId,
            createdAt: snapshot.createdAt,
            state: this.cloneState(snapshot.state)
        };
        this.snapshots.set(snapshotId, restoredSnapshot);
        return restoredSnapshot;
    }
    getSubjectState(subjectId) {
        const subjectState = this.state[subjectId];
        if (!subjectState) {
            return undefined;
        }
        return this.cloneSubjectState(subjectState);
    }
    resolveDecision(existing, incoming) {
        if (!existing) {
            return { decision: incoming, rule: 'new-record', changed: true };
        }
        if (incoming.priority < existing.priority) {
            return { decision: incoming, rule: 'source-precedence', changed: true };
        }
        if (incoming.priority > existing.priority) {
            return { decision: existing, rule: 'source-precedence', changed: false };
        }
        const existingTime = new Date(existing.timestamp).getTime();
        const incomingTime = new Date(incoming.timestamp).getTime();
        if (incomingTime > existingTime) {
            return { decision: incoming, rule: 'recency', changed: true };
        }
        if (incomingTime < existingTime) {
            return { decision: existing, rule: 'recency', changed: false };
        }
        const tieBreak = incoming.recordId.localeCompare(existing.recordId);
        if (tieBreak > 0) {
            return { decision: incoming, rule: 'record-id-tiebreak', changed: true };
        }
        if (tieBreak < 0) {
            return { decision: existing, rule: 'record-id-tiebreak', changed: false };
        }
        return { decision: existing, rule: 'duplicate-record', changed: false };
    }
    buildProof(record, before, after, rule, considered) {
        const beforeNode = {
            id: `before:${record.subjectId}:${record.consentType}`,
            label: 'before',
            payload: before
                ? {
                    recordId: before.recordId,
                    status: before.status,
                    source: before.source,
                    timestamp: before.timestamp,
                    priority: before.priority
                }
                : { status: 'unset' }
        };
        const afterNode = {
            id: `after:${record.subjectId}:${record.consentType}`,
            label: 'after',
            payload: {
                recordId: after.recordId,
                status: after.status,
                source: after.source,
                timestamp: after.timestamp,
                priority: after.priority
            }
        };
        const edge = {
            from: beforeNode.id,
            to: afterNode.id,
            rule,
            recordId: record.recordId
        };
        return {
            subjectId: record.subjectId,
            consentType: record.consentType,
            recordId: record.recordId,
            before,
            after,
            appliedRule: rule,
            graph: {
                nodes: [beforeNode, afterNode],
                edges: [edge]
            },
            considered: considered.map((decision) => ({
                recordId: decision.recordId,
                status: decision.status,
                source: decision.source,
                timestamp: decision.timestamp,
                priority: decision.priority
            }))
        };
    }
    ensureSubjectState(subjectId) {
        if (!this.state[subjectId]) {
            this.state[subjectId] = {};
        }
        return this.state[subjectId];
    }
    captureSnapshot() {
        const id = (0, uuid_1.v4)();
        const snapshot = {
            id,
            createdAt: new Date().toISOString(),
            state: this.cloneState(this.state)
        };
        this.snapshots.set(id, snapshot);
        return id;
    }
    cloneState(state) {
        const clone = {};
        for (const subjectId of Object.keys(state)) {
            clone[subjectId] = this.cloneSubjectState(state[subjectId]);
        }
        return clone;
    }
    cloneSubjectState(state) {
        const clone = {};
        for (const consentType of Object.keys(state)) {
            const decision = state[consentType];
            clone[consentType] = { ...decision };
        }
        return clone;
    }
    areDecisionsEqual(a, b) {
        if (!a && !b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return (a.recordId === b.recordId &&
            a.status === b.status &&
            a.source === b.source &&
            a.timestamp === b.timestamp &&
            a.priority === b.priority);
    }
}
exports.ConsentStateReconciler = ConsentStateReconciler;
