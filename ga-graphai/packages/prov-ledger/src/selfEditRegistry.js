"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfEditRegistry = void 0;
const node_crypto_1 = require("node:crypto");
const DEFAULT_THRESHOLD = 0.88;
const DEFAULT_MIN_VERIFIERS = 2;
class SelfEditRegistry {
    clock;
    defaultTtlMs;
    threshold;
    minVerifierCount;
    records = new Map();
    constructor(options = {}) {
        this.clock = options.clock ?? (() => new Date());
        this.defaultTtlMs = options.defaultTtlMs;
        this.threshold = options.passScoreThreshold ?? DEFAULT_THRESHOLD;
        this.minVerifierCount = options.minVerifierCount ?? DEFAULT_MIN_VERIFIERS;
    }
    register(proposal) {
        this.pruneExpired();
        const now = this.clock();
        const createdAt = now.toISOString();
        const expiresAt = this.computeExpiry(now, proposal.ttlMs ?? this.defaultTtlMs);
        const record = {
            ...proposal,
            id: (0, node_crypto_1.randomUUID)(),
            status: 'proposed',
            createdAt,
            updatedAt: createdAt,
            expiresAt,
            verifierScores: [],
        };
        this.records.set(record.id, record);
        return this.clone(record);
    }
    get(id) {
        this.pruneExpired();
        const record = this.records.get(id);
        return record ? this.clone(record) : undefined;
    }
    list(filter) {
        this.pruneExpired();
        let entries = Array.from(this.records.values());
        if (filter?.status) {
            const statuses = Array.isArray(filter.status)
                ? filter.status
                : [filter.status];
            entries = entries.filter((entry) => statuses.includes(entry.status));
        }
        if (filter?.domain) {
            entries = entries.filter((entry) => entry.domain === filter.domain);
        }
        entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        if (filter?.limit !== undefined && filter.limit >= 0) {
            entries = entries.slice(0, filter.limit);
        }
        return entries.map((entry) => this.clone(entry));
    }
    recordVerifierScore(id, score, options) {
        this.pruneExpired();
        const record = this.require(id);
        const measuredAt = score.measuredAt ?? this.clock().toISOString();
        const newScore = {
            ...score,
            measuredAt,
        };
        record.verifierScores = [...record.verifierScores, newScore];
        record.updatedAt = measuredAt;
        this.applyScorecard(record, options);
        return this.clone(record);
    }
    decide(id, approval) {
        this.pruneExpired();
        const record = this.require(id);
        const decidedAt = approval.decidedAt ?? this.clock().toISOString();
        record.approval = {
            ...approval,
            decidedAt,
        };
        record.updatedAt = decidedAt;
        record.status = approval.decision === 'approved' ? 'approved' : 'rejected';
        return this.clone(record);
    }
    markApplied(id, checkpoint, appliedAt) {
        this.pruneExpired();
        const record = this.require(id);
        const appliedTimestamp = appliedAt ?? this.clock().toISOString();
        record.appliedCheckpoint = checkpoint;
        record.status = 'applied';
        record.updatedAt = appliedTimestamp;
        return this.clone(record);
    }
    expire(id, expiredAt) {
        const record = this.require(id);
        const timestamp = expiredAt ?? this.clock().toISOString();
        if (record.status !== 'applied') {
            record.status = 'expired';
        }
        record.updatedAt = timestamp;
        return this.clone(record);
    }
    getScorecard(id, options) {
        this.pruneExpired();
        const record = this.require(id);
        return this.buildScorecard(record, options);
    }
    sweepExpired() {
        this.pruneExpired();
    }
    computeExpiry(now, ttlMs) {
        if (!ttlMs || ttlMs <= 0) {
            return undefined;
        }
        return new Date(now.getTime() + ttlMs).toISOString();
    }
    pruneExpired() {
        const now = this.clock();
        const nowIso = now.toISOString();
        for (const record of this.records.values()) {
            if (!record.expiresAt) {
                continue;
            }
            if (record.status === 'expired' || record.status === 'applied') {
                continue;
            }
            if (now.getTime() >= Date.parse(record.expiresAt)) {
                record.status = 'expired';
                record.updatedAt = nowIso;
            }
        }
    }
    applyScorecard(record, options) {
        const scorecard = this.buildScorecard(record, options);
        if (record.status === 'applied' || record.status === 'expired') {
            return;
        }
        if (record.approval) {
            record.status =
                record.approval.decision === 'approved' ? 'approved' : 'rejected';
            return;
        }
        if (scorecard.failedChecks > 0) {
            record.status = 'rejected';
            return;
        }
        if (scorecard.ready) {
            record.status = 'approved';
            return;
        }
        if (scorecard.totalChecks > 0) {
            record.status = 'queued';
        }
        else {
            record.status = 'proposed';
        }
    }
    buildScorecard(record, options) {
        const totalChecks = record.verifierScores.length;
        const passedChecks = record.verifierScores.filter((item) => item.passed).length;
        const failedChecks = totalChecks - passedChecks;
        const averageScore = totalChecks === 0
            ? null
            : record.verifierScores.reduce((sum, item) => sum + item.score, 0) /
                totalChecks;
        const threshold = options?.threshold ?? this.threshold;
        const minVerifiers = options?.minVerifierCount ?? this.minVerifierCount;
        const ready = totalChecks >= minVerifiers &&
            failedChecks === 0 &&
            (averageScore ?? 0) >= threshold;
        return {
            totalChecks,
            passedChecks,
            failedChecks,
            averageScore,
            failingVerifiers: record.verifierScores
                .filter((item) => !item.passed)
                .map((item) => item.verifier),
            passedVerifiers: record.verifierScores
                .filter((item) => item.passed)
                .map((item) => item.verifier),
            ready,
            status: record.status,
        };
    }
    require(id) {
        const record = this.records.get(id);
        if (!record) {
            throw new Error(`Unknown self-edit record: ${id}`);
        }
        return record;
    }
    clone(record) {
        return {
            ...record,
            verifierScores: record.verifierScores.map((score) => ({ ...score })),
            approval: record.approval ? { ...record.approval } : undefined,
        };
    }
}
exports.SelfEditRegistry = SelfEditRegistry;
