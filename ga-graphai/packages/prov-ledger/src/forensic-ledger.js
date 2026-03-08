"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForensicAuditLedger = void 0;
exports.forensicLedgerDataSource = forensicLedgerDataSource;
const node_crypto_1 = require("node:crypto");
class ForensicAuditLedger {
    entries = [];
    signingKey;
    system;
    integritySalt;
    constructor(options) {
        this.signingKey = options.signingKey;
        this.system = options.system ?? 'digital-forensics';
        this.integritySalt = options.integritySalt ?? 'forensic-ledger';
    }
    append(input) {
        const timestamp = normaliseTimestamp(input.timestamp);
        const previousHash = this.entries.at(-1)?.hash;
        const id = input.id ?? (0, node_crypto_1.randomUUID)();
        const metadata = {
            ...input.metadata,
            notes: input.notes,
            evidenceId: input.evidenceId,
        };
        const hash = computeEntryHash({
            id,
            timestamp,
            actor: input.actor,
            action: input.action,
            evidenceId: input.evidenceId,
            location: input.location,
            resource: input.resource ?? input.evidenceId,
            category: input.category,
            severity: input.severity,
            metadata,
            correlationIds: input.correlationIds,
            previousHash,
            system: input.system ?? this.system,
        });
        const signature = signHash(hash, this.signingKey, this.integritySalt);
        const entry = {
            id,
            timestamp,
            actor: input.actor,
            action: input.action,
            resource: input.resource ?? input.evidenceId,
            system: input.system ?? this.system,
            category: input.category,
            severity: input.severity,
            metadata,
            correlationIds: input.correlationIds,
            evidenceId: input.evidenceId,
            location: input.location,
            notes: input.notes,
            hash,
            previousHash,
            signature,
        };
        this.entries.push(entry);
        return cloneForensicEntry(entry);
    }
    list(filter) {
        let data = [...this.entries];
        if (filter?.evidenceId) {
            data = data.filter((entry) => entry.evidenceId === filter.evidenceId);
        }
        if (filter?.limit && filter.limit > 0) {
            data = data.slice(-filter.limit);
        }
        return data.map(cloneForensicEntry);
    }
    /**
     * Intentionally mutates an entry for integrity testing. Do not use in
     * production code paths; this exists so tests can simulate tampering without
     * exposing the internal state to callers.
     */
    unsafeMutateEntry(index, mutator) {
        const target = this.entries[index];
        if (!target) {
            throw new Error(`No entry found at index ${index}`);
        }
        mutator(target);
    }
    verifyChain(signingKey = this.signingKey) {
        const failures = [];
        let previousHash;
        this.entries.forEach((entry, index) => {
            if (entry.previousHash !== previousHash) {
                failures.push({
                    index,
                    id: entry.id,
                    reason: 'PREVIOUS_HASH_MISMATCH',
                });
            }
            const recalculated = computeEntryHash({
                id: entry.id,
                timestamp: entry.timestamp,
                actor: entry.actor,
                action: entry.action,
                evidenceId: entry.evidenceId,
                location: entry.location,
                resource: entry.resource,
                category: entry.category,
                severity: entry.severity,
                metadata: entry.metadata,
                correlationIds: entry.correlationIds,
                previousHash,
                system: entry.system,
            });
            if (recalculated !== entry.hash) {
                failures.push({
                    index,
                    id: entry.id,
                    reason: 'HASH_MISMATCH',
                });
            }
            const expectedSignature = signHash(recalculated, signingKey, this.integritySalt);
            if (expectedSignature !== entry.signature) {
                failures.push({
                    index,
                    id: entry.id,
                    reason: 'SIGNATURE_MISMATCH',
                });
            }
            previousHash = entry.hash;
        });
        return {
            ok: failures.length === 0,
            headHash: this.entries.at(-1)?.hash,
            failures,
        };
    }
    buildCustodyTrail(evidenceId) {
        const events = this.list({ evidenceId });
        const breaks = [];
        let expectedPrevious;
        events.forEach((event) => {
            if (event.previousHash && event.previousHash !== expectedPrevious) {
                breaks.push(`Unexpected previous hash for ${event.id}: ${event.previousHash} !== ${expectedPrevious}`);
            }
            expectedPrevious = event.hash;
        });
        return { evidenceId, events, breaks };
    }
    buildComplianceReport(caseId) {
        const verification = this.verifyChain();
        const actors = new Set(this.entries.map((entry) => entry.actor));
        const locations = new Set(this.entries.map((entry) => entry.location).filter(Boolean));
        const custodyTransfers = this.entries.filter((entry) => entry.action.toLowerCase().includes('transfer')).length;
        const accessEvents = this.entries.filter((entry) => entry.action.toLowerCase().includes('access') ||
            entry.action.toLowerCase().includes('view')).length;
        const highSeverityFindings = this.entries.filter((entry) => entry.severity === 'high').length;
        const evidenceItems = new Set(this.entries.map((entry) => entry.evidenceId));
        const custody = Array.from(evidenceItems).map((evidenceId) => this.buildCustodyTrail(evidenceId));
        const summary = {
            totalEvents: this.entries.length,
            evidenceItems: evidenceItems.size,
            accessEvents,
            custodyTransfers,
            uniqueActors: actors.size,
            uniqueLocations: locations.size,
            highSeverityFindings,
        };
        const report = {
            caseId,
            generatedAt: new Date().toISOString(),
            headHash: this.entries.at(-1)?.hash,
            tamperDetected: !verification.ok,
            tamperReasons: verification.failures.map((failure) => failure.reason),
            summary,
            custody,
            digest: '',
        };
        report.digest = (0, node_crypto_1.createHash)('sha256')
            .update(JSON.stringify({
            caseId: report.caseId,
            headHash: report.headHash,
            tamperDetected: report.tamperDetected,
            summary: report.summary,
            custody: report.custody.map((trail) => ({
                evidenceId: trail.evidenceId,
                events: trail.events.map((event) => event.hash),
                breaks: trail.breaks,
            })),
        }))
            .digest('hex');
        return report;
    }
}
exports.ForensicAuditLedger = ForensicAuditLedger;
function forensicLedgerDataSource(system, ledger) {
    return {
        system,
        load: () => ledger.list().map((entry) => convertForensicEntry(entry, system)),
    };
}
function convertForensicEntry(entry, system) {
    return {
        id: entry.id,
        timestamp: entry.timestamp,
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        system: entry.system ?? system,
        category: entry.category ?? 'forensics',
        severity: entry.severity,
        metadata: {
            ...entry.metadata,
            evidenceId: entry.evidenceId,
            location: entry.location,
            hash: entry.hash,
            previousHash: entry.previousHash,
            signature: entry.signature,
        },
        correlationIds: entry.correlationIds ?? [entry.evidenceId],
    };
}
function cloneForensicEntry(entry) {
    return {
        ...entry,
        metadata: entry.metadata ? { ...entry.metadata } : undefined,
        correlationIds: entry.correlationIds ? [...entry.correlationIds] : undefined,
    };
}
function computeEntryHash(entry) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    hash.update(entry.id);
    hash.update(entry.timestamp);
    hash.update(entry.actor);
    hash.update(entry.action);
    hash.update(entry.evidenceId);
    hash.update(entry.resource);
    hash.update(entry.system);
    if (entry.location) {
        hash.update(entry.location);
    }
    if (entry.category) {
        hash.update(entry.category);
    }
    if (entry.severity) {
        hash.update(entry.severity);
    }
    if (entry.metadata) {
        hash.update(JSON.stringify(entry.metadata));
    }
    if (entry.correlationIds && entry.correlationIds.length > 0) {
        hash.update(entry.correlationIds.join('|'));
    }
    if (entry.previousHash) {
        hash.update(entry.previousHash);
    }
    return hash.digest('hex');
}
function signHash(hash, signingKey, salt) {
    return (0, node_crypto_1.createHmac)('sha256', signingKey).update(hash + salt).digest('hex');
}
function normaliseTimestamp(value) {
    if (value) {
        return new Date(value).toISOString();
    }
    return new Date().toISOString();
}
