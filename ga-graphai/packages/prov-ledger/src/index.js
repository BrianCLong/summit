"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInvestigationPlatform = exports.AppendOnlyAuditLog = exports.CoopProvenanceLedger = exports.SelfEditRegistry = exports.ProvenanceLedger = exports.SimpleProvenanceLedger = exports.InMemoryLedger = void 0;
exports.buildEvidencePayload = buildEvidencePayload;
exports.record = record;
exports.hashPayload = hashPayload;
exports.createProvenanceRecord = createProvenanceRecord;
exports.signRecord = signRecord;
exports.verifySignature = verifySignature;
exports.createAuditExportRouter = createAuditExportRouter;
exports.runAuditVerifierCli = runAuditVerifierCli;
exports.simpleLedgerDataSource = simpleLedgerDataSource;
exports.cursorLedgerDataSource = cursorLedgerDataSource;
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const common_types_1 = require("common-types");
const manifest_js_1 = require("./manifest.js");
const quantum_safe_ledger_js_1 = require("./quantum-safe-ledger.js");
const bundle_utils_js_1 = require("./bundle-utils.js");
__exportStar(require("./mul-ledger"), exports);
__exportStar(require("./quantum-safe-ledger"), exports);
__exportStar(require("./service"), exports);
__exportStar(require("./grpc"), exports);
__exportStar(require("./audit-readiness"), exports);
__exportStar(require("./bundle-utils"), exports);
__exportStar(require("./bundle-verifier"), exports);
function buildEvidencePayload(input) {
    const timestamp = input.timestamp ?? new Date().toISOString();
    const base = {
        tenant: input.tenant,
        caseId: input.caseId,
        environment: input.environment,
        operation: input.operation,
        request: input.request,
        policy: input.policy,
        decision: input.decision,
        model: input.model,
        cost: input.cost,
        output: input.output,
        correlationId: input.correlationId,
    };
    const signature = input.signature ??
        `stub-signature:${(0, node_crypto_1.createHash)('sha256')
            .update(JSON.stringify({
            tenant: base.tenant,
            caseId: base.caseId,
            operation: base.operation,
            correlationId: base.correlationId,
        }))
            .digest('hex')}`;
    return {
        ...base,
        id: input.id ?? (0, node_crypto_1.randomUUID)(),
        timestamp,
        signature,
    };
}
class InMemoryLedger {
    entries = new Map();
    record(payload) {
        const entry = buildEvidencePayload(payload);
        this.entries.set(entry.id, entry);
        return entry;
    }
    get(id) {
        return this.entries.get(id);
    }
    list(limit) {
        const values = Array.from(this.entries.values());
        if (limit && limit > 0) {
            return values.slice(-limit);
        }
        return values;
    }
}
exports.InMemoryLedger = InMemoryLedger;
// ============================================================================
// SIMPLE PROVENANCE LEDGER - From HEAD
// ============================================================================
function normaliseTimestamp(value) {
    if (value) {
        return new Date(value).toISOString();
    }
    return new Date().toISOString();
}
function computeHash(entry) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    hash.update(entry.id);
    hash.update(entry.category);
    hash.update(entry.actor);
    hash.update(entry.action);
    hash.update(entry.resource);
    hash.update(JSON.stringify(entry.payload));
    hash.update(entry.timestamp);
    if (entry.previousHash) {
        hash.update(entry.previousHash);
    }
    return hash.digest('hex');
}
class SimpleProvenanceLedger {
    entries = [];
    append(fact) {
        const timestamp = normaliseTimestamp(fact.timestamp);
        const previousHash = this.entries.at(-1)?.hash;
        const entry = {
            ...fact,
            timestamp,
            previousHash,
            hash: '',
        };
        entry.hash = computeHash(entry);
        this.entries.push(entry);
        return entry;
    }
    list(filter) {
        let data = [...this.entries];
        if (filter?.category) {
            data = data.filter((entry) => entry.category === filter.category);
        }
        if (filter?.limit && filter.limit > 0) {
            data = data.slice(-filter.limit);
        }
        return data;
    }
    verify() {
        return this.entries.every((entry, index) => {
            const expectedPrevious = index === 0 ? undefined : this.entries[index - 1].hash;
            if (expectedPrevious !== entry.previousHash) {
                return false;
            }
            const recalculated = computeHash({ ...entry });
            return recalculated === entry.hash;
        });
    }
    exportEvidence(filter) {
        const entries = this.list(filter);
        const baseBundle = {
            generatedAt: new Date().toISOString(),
            headHash: entries.at(-1)?.hash,
            entries,
        };
        return (0, bundle_utils_js_1.augmentEvidenceBundle)(baseBundle, entries);
    }
}
exports.SimpleProvenanceLedger = SimpleProvenanceLedger;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_MS = 365 * DAY_IN_MS;
class ProvenanceLedger {
    now;
    retentionMs;
    records = [];
    bySession = new Map();
    byRepo = new Map();
    constructor(options = {}) {
        this.now = options.now ?? (() => new Date());
        this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
    }
    async append(event, options) {
        this.prune();
        const receivedAt = (options.receivedAt ?? this.now()).toISOString();
        const checksum = this.computeChecksum(event, options.decision, receivedAt);
        const record = {
            ...event,
            policy: options.decision,
            receivedAt,
            checksum,
            budget: options.budget,
            rateLimit: options.rateLimit,
        };
        this.records.push(record);
        this.index(record);
        return record;
    }
    list(limit = 200) {
        if (limit >= this.records.length) {
            return [...this.records];
        }
        return this.records.slice(this.records.length - limit);
    }
    findBySession(sessionId) {
        return this.bySession.get(sessionId) ?? [];
    }
    findByRepo(repo) {
        return this.byRepo.get(repo) ?? [];
    }
    findByRequest(requestId) {
        return this.records.find((record) => record.provenance.requestId === requestId);
    }
    stats() {
        return {
            totalRecords: this.records.length,
            uniqueSessions: this.bySession.size,
            uniqueRepos: this.byRepo.size,
            lastDecisionAt: this.records.at(-1)?.receivedAt,
        };
    }
    coverageForDiffHashes(repo, diffHashes) {
        const records = this.findByRepo(repo);
        if (diffHashes.length === 0) {
            return { coverage: 1, missing: [] };
        }
        const seen = new Set();
        for (const record of records) {
            const hash = record.outputRef?.diffSha256;
            if (hash) {
                seen.add(hash);
            }
        }
        const missing = [];
        for (const hash of diffHashes) {
            if (!seen.has(hash)) {
                missing.push(hash);
            }
        }
        const coverage = 1 - missing.length / diffHashes.length;
        return { coverage, missing };
    }
    prune() {
        if (this.retentionMs === null) {
            return;
        }
        const threshold = this.now().getTime() - this.retentionMs;
        if (threshold <= 0) {
            return;
        }
        while (this.records.length > 0) {
            const record = this.records[0];
            const ts = Date.parse(record.receivedAt);
            if (Number.isNaN(ts) || ts >= threshold) {
                break;
            }
            this.records.shift();
            this.removeFromIndex(record);
        }
    }
    computeChecksum(event, decision, receivedAt) {
        const hash = (0, node_crypto_1.createHash)('sha256');
        hash.update(JSON.stringify({ event, decision, receivedAt }));
        return hash.digest('hex');
    }
    index(record) {
        const sessionId = record.provenance.sessionId;
        if (!this.bySession.has(sessionId)) {
            this.bySession.set(sessionId, []);
        }
        this.bySession.get(sessionId)?.push(record);
        const repo = record.repo;
        if (!this.byRepo.has(repo)) {
            this.byRepo.set(repo, []);
        }
        this.byRepo.get(repo)?.push(record);
    }
    removeFromIndex(record) {
        const sessionId = record.provenance.sessionId;
        const sessionRecords = this.bySession.get(sessionId);
        if (sessionRecords) {
            const idx = sessionRecords.indexOf(record);
            if (idx >= 0) {
                sessionRecords.splice(idx, 1);
            }
            if (sessionRecords.length === 0) {
                this.bySession.delete(sessionId);
            }
        }
        const repo = record.repo;
        const repoRecords = this.byRepo.get(repo);
        if (repoRecords) {
            const idx = repoRecords.indexOf(record);
            if (idx >= 0) {
                repoRecords.splice(idx, 1);
            }
            if (repoRecords.length === 0) {
                this.byRepo.delete(repo);
            }
        }
    }
}
exports.ProvenanceLedger = ProvenanceLedger;
var selfEditRegistry_1 = require("./selfEditRegistry");
Object.defineProperty(exports, "SelfEditRegistry", { enumerable: true, get: function () { return selfEditRegistry_1.SelfEditRegistry; } });
function record(run, workflow, context, options = {}) {
    const normalized = (0, common_types_1.normalizeWorkflow)(workflow);
    const timestamp = context.timestamp ?? new Date().toISOString();
    const evidence = (0, common_types_1.collectEvidencePointers)(normalized.nodes);
    const inputsHash = hashObject({
        workflowId: normalized.workflowId,
        version: normalized.version,
        policy: normalized.policy,
        constraints: normalized.constraints,
        nodes: normalized.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            params: node.params,
            evidenceOutputs: node.evidenceOutputs,
        })),
        edges: normalized.edges,
    });
    const outputsHash = hashObject({
        runId: run.runId,
        status: run.status,
        stats: run.stats,
        nodes: options.includeNodeMetrics ? run.nodes : undefined,
    });
    const signature = signPayload({
        runId: run.runId,
        workflowId: normalized.workflowId,
        version: normalized.version,
        inputsHash,
        outputsHash,
        timestamp,
    }, context.signingKey);
    const ledgerUri = (0, common_types_1.buildLedgerUri)(context, run.runId);
    return {
        runId: run.runId,
        workflowId: normalized.workflowId,
        version: normalized.version,
        tenantId: normalized.tenantId,
        status: run.status,
        policy: normalized.policy,
        stats: run.stats,
        evidence,
        inputsHash,
        outputsHash,
        signature,
        ledgerUri,
        timestamp,
        tags: options.evaluationTags,
    };
}
function hashObject(value) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
}
function signPayload(payload, signingKey) {
    return (0, node_crypto_1.createHmac)('sha256', signingKey)
        .update(JSON.stringify(payload))
        .digest('hex');
}
function hashPayload(payload) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(payload)).digest('hex');
}
function hashPrompt(prompt) {
    return (0, node_crypto_1.createHash)('sha256').update(prompt).digest('hex');
}
function toIso(timestamp) {
    return timestamp.toISOString();
}
function createProvenanceRecord(input) {
    const start = input.startedAt ?? new Date();
    const end = input.completedAt ?? start;
    return {
        reqId: input.reqId,
        step: input.step,
        inputHash: hashPayload(input.input),
        outputHash: hashPayload(input.output),
        modelId: input.modelId,
        ckpt: input.ckpt,
        promptHash: hashPrompt(input.prompt),
        params: input.params,
        scores: input.scores ?? {},
        policy: input.policy,
        time: {
            start: toIso(start),
            end: toIso(end),
        },
        tags: input.tags,
    };
}
function signRecord(record, secret) {
    const payload = JSON.stringify(record);
    const signature = (0, node_crypto_1.createHmac)('sha256', secret).update(payload).digest('hex');
    return { record, signature };
}
function verifySignature(entry, secret) {
    const expected = (0, node_crypto_1.createHmac)('sha256', secret)
        .update(JSON.stringify(entry.record))
        .digest('hex');
    return expected === entry.signature;
}
class CoopProvenanceLedger {
    items = new Map();
    secret;
    constructor(secret) {
        this.secret = secret ?? (0, node_crypto_1.randomUUID)();
    }
    append(input) {
        const record = createProvenanceRecord(input);
        const signed = signRecord(record, this.secret);
        const collection = this.items.get(record.reqId) ?? [];
        collection.push(signed);
        this.items.set(record.reqId, collection);
        return signed;
    }
    list(reqId) {
        if (!reqId) {
            return Array.from(this.items.values()).flat();
        }
        return [...(this.items.get(reqId) ?? [])];
    }
    verifyAll(secret) {
        return this.list().every((entry) => this.verifyRecord(entry, secret));
    }
    getSecret() {
        return this.secret;
    }
    verifyRecord(entry, secret) {
        const signerSecret = secret ?? this.secret;
        return verifySignature(entry, signerSecret);
    }
    verifyFor(reqId, secret) {
        return this.list(reqId).every((entry) => this.verifyRecord(entry, secret));
    }
}
exports.CoopProvenanceLedger = CoopProvenanceLedger;
// ============================================================================
// AUDIT INVESTIGATION PLATFORM
// ============================================================================
const FALLBACK_CAPABILITIES = {
    query: false,
    export: false,
    viewAnomalies: false,
};
const DEFAULT_ROLE_MATRIX = {
    viewer: { query: true, export: false, viewAnomalies: false },
    analyst: { query: true, export: true, viewAnomalies: true },
    admin: { query: true, export: true, viewAnomalies: true },
};
const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS_AUDIT = 24 * HOUR_IN_MS;
function uniqueValues(values) {
    if (!values) {
        return undefined;
    }
    const seen = new Set();
    const deduped = [];
    for (const value of values) {
        if (!seen.has(value)) {
            seen.add(value);
            deduped.push(value);
        }
    }
    return deduped;
}
function cloneEvent(event) {
    return {
        ...event,
        metadata: event.metadata ? { ...event.metadata } : undefined,
        correlationIds: event.correlationIds
            ? [...event.correlationIds]
            : undefined,
    };
}
function cloneResult(result, cached) {
    return {
        ...result,
        cached,
        events: result.events.map(cloneEvent),
        timeline: result.timeline.map((point) => ({ ...point })),
        anomalies: result.anomalies.map((anomaly) => ({
            ...anomaly,
            events: anomaly.events.map(cloneEvent),
        })),
        correlations: result.correlations.map((correlation) => ({
            ...correlation,
            systems: [...correlation.systems],
            events: correlation.events.map(cloneEvent),
        })),
    };
}
function parseSeverity(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalised = value.trim().toLowerCase();
    switch (normalised) {
        case 'info':
        case 'information':
            return 'info';
        case 'low':
            return 'low';
        case 'medium':
        case 'moderate':
            return 'medium';
        case 'high':
        case 'severe':
        case 'sev1':
            return 'high';
        case 'critical':
        case 'sev0':
            return 'critical';
        default:
            return undefined;
    }
}
function sanitizeMetadata(metadata) {
    if (!metadata) {
        return {};
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(metadata)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('email') ||
            lowerKey.includes('ssn') ||
            lowerKey.includes('phone') ||
            lowerKey.includes('pii')) {
            sanitized[key] = '[REDACTED]';
            continue;
        }
        if (typeof value === 'string' && value.includes('@')) {
            sanitized[key] = '[REDACTED]';
            continue;
        }
        sanitized[key] = value;
    }
    return sanitized;
}
function toLedgerEntryFromAudit(event, previousHash) {
    const timestamp = normaliseTimestamp(event.timestamp);
    const correlationIds = uniqueValues(event.correlationIds);
    const payload = {
        ...sanitizeMetadata(event.metadata),
        system: event.system,
        severity: event.severity,
        correlationIds,
    };
    const entry = {
        id: event.id,
        category: event.category ?? 'audit',
        actor: event.actor,
        action: event.action,
        resource: event.resource,
        payload,
        timestamp,
        previousHash,
        hash: '',
    };
    entry.hash = (0, quantum_safe_ledger_js_1.computeLedgerHash)(entry, timestamp, previousHash);
    return entry;
}
function ledgerEntryToAuditEvent(entry) {
    const payload = { ...entry.payload };
    const system = typeof payload.system === 'string' && payload.system.length > 0
        ? payload.system
        : entry.resource;
    if (payload.system) {
        delete payload.system;
    }
    const severity = parseSeverity(payload.severity);
    if (payload.severity) {
        delete payload.severity;
    }
    const correlationIds = toStringArray(payload.correlationIds);
    if (payload.correlationIds) {
        delete payload.correlationIds;
    }
    return {
        id: entry.id,
        timestamp: entry.timestamp,
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        system,
        category: entry.category,
        severity,
        metadata: Object.keys(payload).length ? payload : undefined,
        correlationIds: uniqueValues(correlationIds),
        previousHash: entry.previousHash,
        eventHash: entry.hash,
    };
}
function verifyEvidenceChain(entries, anchor) {
    const reasons = [];
    let previous = anchor;
    for (const entry of entries) {
        if (previous !== undefined && entry.previousHash !== previous) {
            reasons.push(`Previous hash mismatch for ${entry.id}`);
        }
        const recalculated = (0, quantum_safe_ledger_js_1.computeLedgerHash)(entry, entry.timestamp, entry.previousHash);
        if (recalculated !== entry.hash) {
            reasons.push(`Hash mismatch for ${entry.id}`);
        }
        previous = entry.hash;
    }
    return { ok: reasons.length === 0, headHash: previous, reasons };
}
function auditExportSchema() {
    return {
        version: '2025-01',
        piiSafe: true,
        hashAlgorithm: 'sha256',
        fields: [
            'id',
            'timestamp',
            'actor',
            'action',
            'resource',
            'system',
            'category',
            'severity',
            'metadata',
            'correlationIds',
            'previousHash',
            'eventHash',
        ],
        pagination: 'cursor',
    };
}
class AppendOnlyAuditLog {
    entries = [];
    ids = new Set();
    append(event) {
        if ('previousHash' in event || 'eventHash' in event) {
            throw new Error('Append-only audit log rejects client-supplied hash fields');
        }
        if (this.ids.has(event.id)) {
            throw new Error('Append-only audit log rejects mutations to existing events');
        }
        const previousHash = this.entries.at(-1)?.hash;
        const entry = toLedgerEntryFromAudit(event, previousHash);
        this.entries.push(entry);
        this.ids.add(entry.id);
        return ledgerEntryToAuditEvent(entry);
    }
    list() {
        return this.entries.map((entry) => ledgerEntryToAuditEvent(entry));
    }
    verify() {
        return verifyEvidenceChain(this.entries);
    }
    exportBundle(options) {
        const filtered = this.filterRange(options.from, options.to);
        const total = filtered.length;
        const limit = options.limit && options.limit > 0 ? options.limit : 100;
        const cursor = Math.max(0, options.cursor ?? 0);
        const slice = filtered.slice(cursor, cursor + limit);
        const anchor = cursor > 0 ? filtered[cursor - 1]?.hash : undefined;
        const evidence = {
            generatedAt: new Date().toISOString(),
            headHash: slice.at(-1)?.hash,
            entries: slice.map((entry) => ({ ...entry })),
        };
        const manifest = (0, manifest_js_1.createExportManifest)({
            caseId: options.caseId ?? 'audit-trail',
            ledger: slice,
            evidence,
        });
        const verification = {
            chain: verifyEvidenceChain(slice, anchor),
            manifest: (0, manifest_js_1.verifyManifest)(manifest, slice, { evidence }),
        };
        const nextCursor = cursor + slice.length < total ? cursor + slice.length : undefined;
        return {
            page: {
                cursor,
                pageSize: limit,
                total,
                nextCursor,
                from: options.from,
                to: options.to,
            },
            events: slice.map((entry) => ledgerEntryToAuditEvent(entry)),
            evidence,
            manifest,
            schema: auditExportSchema(),
            verification,
        };
    }
    filterRange(from, to) {
        let data = [...this.entries];
        if (from) {
            const fromTs = new Date(from).getTime();
            data = data.filter((entry) => new Date(entry.timestamp).getTime() >= fromTs);
        }
        if (to) {
            const toTs = new Date(to).getTime();
            data = data.filter((entry) => new Date(entry.timestamp).getTime() <= toTs);
        }
        return data;
    }
}
exports.AppendOnlyAuditLog = AppendOnlyAuditLog;
function createAuditExportRouter(log) {
    const router = (0, express_1.Router)();
    router.get('/audit/export', (req, res) => {
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
        const from = typeof req.query.from === 'string' ? req.query.from : undefined;
        const to = typeof req.query.to === 'string' ? req.query.to : undefined;
        const caseId = typeof req.query.caseId === 'string' ? req.query.caseId : undefined;
        const bundle = log.exportBundle({ from, to, limit, cursor, caseId });
        res.json(bundle);
    });
    return router;
}
async function runAuditVerifierCli(evidence, manifest, logger = console) {
    const chain = verifyEvidenceChain(evidence.entries);
    const manifestReport = (0, manifest_js_1.verifyManifest)(manifest, evidence.entries, {
        evidence,
    });
    if (chain.ok && manifestReport.valid) {
        logger.log('Audit chain verified');
        return 0;
    }
    const reasons = [...chain.reasons, ...manifestReport.reasons];
    logger.error('Audit verification failed', reasons);
    return 1;
}
function toStringArray(value) {
    if (Array.isArray(value)) {
        const values = value
            .map((item) => {
            if (typeof item === 'string') {
                return item;
            }
            if (typeof item === 'number') {
                return String(item);
            }
            return undefined;
        })
            .filter((item) => Boolean(item));
        return values.length ? values : undefined;
    }
    if (typeof value === 'string') {
        const segments = value
            .split(',')
            .map((segment) => segment.trim())
            .filter(Boolean);
        return segments.length ? segments : undefined;
    }
    return undefined;
}
function metadataToText(metadata) {
    if (!metadata) {
        return '';
    }
    try {
        return JSON.stringify(metadata).toLowerCase();
    }
    catch (error) {
        return Object.entries(metadata)
            .map(([key, value]) => `${key}:${String(value)}`)
            .join(' ')
            .toLowerCase();
    }
}
function matchesCandidate(value, candidates, mode = 'exact') {
    if (!candidates || candidates.length === 0) {
        return true;
    }
    const haystack = value.toLowerCase();
    return candidates.some((candidate) => {
        const needle = candidate.toLowerCase();
        if (mode === 'contains') {
            return haystack.includes(needle);
        }
        return haystack === needle;
    });
}
function parseTimestamp(value) {
    if (!value) {
        return Number.NaN;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
}
function timelineVisual(index, event) {
    const ts = new Date(event.timestamp).toISOString();
    const truncatedSystem = event.system.length > 18 ? `${event.system.slice(0, 15)}…` : event.system;
    const paddedSystem = truncatedSystem.padEnd(18, ' ');
    return `${String(index + 1).padStart(3, ' ')} | ${ts} | ${paddedSystem} | ${event.actor} -> ${event.action} (${event.resource})`;
}
function correlationKeys(event) {
    if (event.correlationIds && event.correlationIds.length > 0) {
        return event.correlationIds;
    }
    return [event.resource];
}
function ledgerSeverityFallback(category) {
    if (!category) {
        return undefined;
    }
    const normalised = category.toLowerCase();
    if (normalised.includes('error') || normalised.includes('deny')) {
        return 'high';
    }
    if (normalised.includes('warn')) {
        return 'medium';
    }
    return undefined;
}
function convertSimpleLedgerEntry(entry, system) {
    const metadata = { ...entry.payload };
    const severity = parseSeverity(metadata.severity) ??
        parseSeverity(metadata.level) ??
        ledgerSeverityFallback(entry.category);
    const correlationIds = toStringArray(metadata.correlationIds) ??
        toStringArray(metadata.correlationId);
    if (metadata.correlationIds) {
        delete metadata.correlationIds;
    }
    if (metadata.correlationId) {
        delete metadata.correlationId;
    }
    const resolvedSystem = typeof metadata.system === 'string' && metadata.system.length > 0
        ? metadata.system
        : system;
    if (metadata.system) {
        delete metadata.system;
    }
    return {
        id: entry.id,
        timestamp: entry.timestamp,
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        system: resolvedSystem,
        category: entry.category,
        severity,
        metadata,
        correlationIds: uniqueValues(correlationIds),
    };
}
function convertCursorRecord(record, system) {
    const actor = record.actor.displayName ?? record.actor.email ?? record.actor.id;
    const metadata = {
        branch: record.branch,
        repo: record.repo,
        usage: record.usage,
        policy: record.policy,
        budget: record.budget,
        rateLimit: record.rateLimit,
        purpose: record.purpose,
    };
    const severity = record.policy?.decision === 'deny' ? 'high' : 'info';
    const correlationSeeds = [
        record.provenance.sessionId,
        record.provenance.requestId,
        record.provenance.parentRequestId,
        record.storyRef?.id,
    ];
    const correlationIds = uniqueValues(correlationSeeds.filter((value) => Boolean(value)));
    const resolvedSystem = record.model?.name ?? system;
    const timestamp = record.receivedAt ?? record.ts;
    return {
        id: record.provenance.requestId ?? (0, node_crypto_1.randomUUID)(),
        timestamp,
        actor,
        action: record.event,
        resource: record.repo,
        system: resolvedSystem,
        category: record.policy?.decision,
        severity,
        metadata,
        correlationIds,
    };
}
class AuditInvestigationPlatform {
    dataSources = [];
    cache = new Map();
    cacheOrder = [];
    cacheTtlMs;
    maxCacheEntries;
    anomalyMultiplier;
    anomalyMinEvents;
    roleMatrix;
    now;
    trail = [];
    constructor(sources, options = {}) {
        this.dataSources = [...sources];
        this.cacheTtlMs = options.cacheTtlMs ?? 5 * MINUTE_IN_MS;
        this.maxCacheEntries = options.maxCacheEntries ?? 50;
        this.anomalyMultiplier = options.anomalyMultiplier ?? 2.5;
        this.anomalyMinEvents = options.anomalyMinEvents ?? 3;
        this.roleMatrix = this.buildRoleMatrix(options.roleMatrix);
        this.now = options.now ?? (() => new Date());
    }
    addDataSource(source) {
        this.dataSources.push(source);
    }
    async runQuery(filter, context, options = {}) {
        this.ensureAuthorized(context, 'query');
        const normalisedFilter = this.normaliseFilter(filter);
        const finalOptions = {
            includeTimeline: options.includeTimeline ?? true,
            includeAnomalies: options.includeAnomalies ?? true,
            includeCorrelations: options.includeCorrelations ?? true,
            useCache: options.useCache ?? true,
            limit: options.limit,
            exportFormat: options.exportFormat,
            optimize: options.optimize ?? false,
            naturalLanguage: options.naturalLanguage,
        };
        const cacheKey = this.cacheKey(normalisedFilter, finalOptions);
        const useCache = Boolean(finalOptions.useCache) && this.cacheTtlMs > 0;
        if (useCache) {
            const cached = this.readCache(cacheKey);
            if (cached) {
                this.recordInvestigation(context, normalisedFilter, finalOptions, cached);
                return cached;
            }
        }
        const start = this.now();
        const events = await this.loadEvents(normalisedFilter, finalOptions.limit);
        const timeline = finalOptions.includeTimeline === false ? [] : this.buildTimeline(events);
        const anomalies = finalOptions.includeAnomalies === false
            ? []
            : this.maybeDetectAnomalies(events, context);
        const correlations = finalOptions.includeCorrelations === false
            ? []
            : this.correlateEvents(events);
        const optimizedPlan = finalOptions.optimize
            ? this.describeOptimization(normalisedFilter, events, finalOptions.limit)
            : undefined;
        let exportPayload;
        let exportFormat;
        if (finalOptions.exportFormat) {
            this.ensureAuthorized(context, 'export');
            exportFormat = finalOptions.exportFormat;
            exportPayload = this.buildExport(events, finalOptions.exportFormat);
        }
        const finished = this.now();
        const durationMs = finished.getTime() - start.getTime();
        const result = {
            queryId: (0, node_crypto_1.randomUUID)(),
            executedAt: finished.toISOString(),
            durationMs,
            filter: normalisedFilter,
            events,
            timeline,
            anomalies,
            correlations,
            optimizedPlan,
            cached: false,
            exportPayload,
            exportFormat,
            naturalLanguage: finalOptions.naturalLanguage,
        };
        if (useCache) {
            this.writeCache(cacheKey, result);
        }
        this.recordInvestigation(context, normalisedFilter, finalOptions, result);
        return result;
    }
    async runNaturalLanguageQuery(query, context, options = {}) {
        const parsed = this.parseNaturalLanguageQuery(query);
        const mergedOptions = {
            ...parsed.options,
            ...options,
            naturalLanguage: query,
        };
        return this.runQuery(parsed.filter, context, mergedOptions);
    }
    getInvestigationTrail(limit) {
        const entries = limit && limit > 0 ? this.trail.slice(-limit) : [...this.trail];
        return entries.map((entry) => ({
            ...entry,
            investigator: {
                ...entry.investigator,
                roles: [...entry.investigator.roles],
            },
            query: {
                filter: { ...entry.query.filter },
                options: { ...entry.query.options },
            },
            resultSummary: { ...entry.resultSummary },
        }));
    }
    clearCache() {
        this.cache.clear();
        this.cacheOrder.length = 0;
    }
    parseNaturalLanguageQuery(query) {
        const filter = {};
        const options = {
            includeAnomalies: true,
            includeCorrelations: true,
            includeTimeline: true,
            optimize: true,
            useCache: true,
        };
        const text = query.trim();
        if (!text) {
            return { filter, options };
        }
        filter.text = text;
        const actorPattern = /actor:\s*("([^"]+)"|([^,\s]+))/gi;
        let match;
        while ((match = actorPattern.exec(text))) {
            const value = (match[2] ?? match[3] ?? '').trim();
            if (value) {
                filter.actors = [...(filter.actors ?? []), value];
            }
        }
        const actionPattern = /action:\s*("([^"]+)"|([^,\s]+))/gi;
        while ((match = actionPattern.exec(text))) {
            const value = (match[2] ?? match[3] ?? '').trim();
            if (value) {
                filter.actions = [...(filter.actions ?? []), value];
            }
        }
        const resourcePattern = /resource:\s*("([^"]+)"|([^,\s]+))/gi;
        while ((match = resourcePattern.exec(text))) {
            const value = (match[2] ?? match[3] ?? '').trim();
            if (value) {
                filter.resources = [...(filter.resources ?? []), value];
            }
        }
        const systemPattern = /system:\s*("([^"]+)"|([^,\s]+))/gi;
        while ((match = systemPattern.exec(text))) {
            const value = (match[2] ?? match[3] ?? '').trim();
            if (value) {
                filter.systems = [...(filter.systems ?? []), value];
            }
        }
        const categoryPattern = /category:\s*("([^"]+)"|([^,\s]+))/gi;
        while ((match = categoryPattern.exec(text))) {
            const value = (match[2] ?? match[3] ?? '').trim();
            if (value) {
                filter.categories = [...(filter.categories ?? []), value];
            }
        }
        const correlationPattern = /correlation:\s*("([^"]+)"|([^,\s]+))/gi;
        while ((match = correlationPattern.exec(text))) {
            const value = (match[2] ?? match[3] ?? '').trim();
            if (value) {
                filter.correlationIds = [...(filter.correlationIds ?? []), value];
            }
        }
        const severityPattern = /severity:\s*("([^"]+)"|([^,\s]+))/gi;
        while ((match = severityPattern.exec(text))) {
            const value = (match[2] ?? match[3] ?? '').trim();
            const severity = parseSeverity(value);
            if (severity) {
                filter.severities = [...(filter.severities ?? []), severity];
            }
        }
        const limitMatch = text.match(/limit\s+(\d+)/i);
        if (limitMatch) {
            const parsedLimit = Number.parseInt(limitMatch[1], 10);
            if (!Number.isNaN(parsedLimit)) {
                options.limit = parsedLimit;
            }
        }
        const lastMatch = text.match(/last\s+(\d+)\s+(minute|minutes|hour|hours|day|days)/i);
        if (lastMatch) {
            const amount = Number.parseInt(lastMatch[1], 10);
            const unit = lastMatch[2].toLowerCase();
            const multiplier = unit.startsWith('minute')
                ? MINUTE_IN_MS
                : unit.startsWith('hour')
                    ? HOUR_IN_MS
                    : DAY_IN_MS_AUDIT;
            const from = new Date(this.now().getTime() - amount * multiplier);
            filter.from = from.toISOString();
        }
        const betweenMatch = text.match(/between\s+([^\s]+)\s+and\s+([^\s]+)/i);
        if (betweenMatch) {
            const fromValue = betweenMatch[1];
            const toValue = betweenMatch[2];
            const fromTs = parseTimestamp(fromValue);
            const toTs = parseTimestamp(toValue);
            if (!Number.isNaN(fromTs)) {
                filter.from = new Date(fromTs).toISOString();
            }
            if (!Number.isNaN(toTs)) {
                filter.to = new Date(toTs).toISOString();
            }
        }
        const sinceMatch = text.match(/since\s+([^\s]+)/i);
        if (sinceMatch && !filter.from) {
            const sinceTs = parseTimestamp(sinceMatch[1]);
            if (!Number.isNaN(sinceTs)) {
                filter.from = new Date(sinceTs).toISOString();
            }
        }
        return {
            filter: this.normaliseFilter(filter),
            options,
        };
    }
    normaliseFilter(filter) {
        const normalised = {
            ...filter,
            actors: uniqueValues(filter.actors?.map((actor) => actor.trim()).filter(Boolean)),
            actions: uniqueValues(filter.actions?.map((action) => action.trim()).filter(Boolean)),
            resources: uniqueValues(filter.resources?.map((resource) => resource.trim()).filter(Boolean)),
            systems: uniqueValues(filter.systems?.map((system) => system.trim()).filter(Boolean)),
            categories: uniqueValues(filter.categories?.map((category) => category.trim()).filter(Boolean)),
            severities: uniqueValues(filter.severities),
            correlationIds: uniqueValues(filter.correlationIds?.map((value) => value.trim()).filter(Boolean)),
        };
        if (filter.from) {
            const fromTs = parseTimestamp(filter.from);
            if (!Number.isNaN(fromTs)) {
                normalised.from = new Date(fromTs).toISOString();
            }
            else {
                delete normalised.from;
            }
        }
        if (filter.to) {
            const toTs = parseTimestamp(filter.to);
            if (!Number.isNaN(toTs)) {
                normalised.to = new Date(toTs).toISOString();
            }
            else {
                delete normalised.to;
            }
        }
        if (filter.text) {
            normalised.text = filter.text.trim();
        }
        return normalised;
    }
    matchesFilter(event, filter) {
        if (!matchesCandidate(event.actor, filter.actors, 'contains')) {
            return false;
        }
        if (!matchesCandidate(event.action, filter.actions, 'contains')) {
            return false;
        }
        if (!matchesCandidate(event.resource, filter.resources, 'contains')) {
            return false;
        }
        if (!matchesCandidate(event.system, filter.systems)) {
            return false;
        }
        if (filter.categories && filter.categories.length > 0) {
            const category = event.category ?? '';
            if (!matchesCandidate(category, filter.categories, 'contains')) {
                return false;
            }
        }
        if (filter.severities && filter.severities.length > 0) {
            if (!event.severity ||
                !matchesCandidate(event.severity, filter.severities)) {
                return false;
            }
        }
        if (filter.correlationIds && filter.correlationIds.length > 0) {
            const ids = event.correlationIds ?? [];
            const hasCorrelation = filter.correlationIds.some((candidate) => ids.some((id) => id.toLowerCase() === candidate.toLowerCase()));
            if (!hasCorrelation) {
                return false;
            }
        }
        if (filter.from) {
            const eventTs = parseTimestamp(event.timestamp);
            const fromTs = parseTimestamp(filter.from);
            if (!Number.isNaN(fromTs) && eventTs < fromTs) {
                return false;
            }
        }
        if (filter.to) {
            const eventTs = parseTimestamp(event.timestamp);
            const toTs = parseTimestamp(filter.to);
            if (!Number.isNaN(toTs) && eventTs > toTs) {
                return false;
            }
        }
        if (filter.text) {
            const haystack = [
                event.id,
                event.actor,
                event.action,
                event.resource,
                event.system,
                event.category ?? '',
                event.severity ?? '',
                metadataToText(event.metadata),
                (event.correlationIds ?? []).join(' '),
            ]
                .join(' ')
                .toLowerCase();
            if (!haystack.includes(filter.text.toLowerCase())) {
                return false;
            }
        }
        return true;
    }
    async loadEvents(filter, limit) {
        const events = [];
        for (const source of this.dataSources) {
            const loaded = await Promise.resolve(source.load(filter));
            for (const event of loaded) {
                const clone = cloneEvent(event);
                clone.system = clone.system || source.system;
                clone.correlationIds = uniqueValues(clone.correlationIds);
                events.push(clone);
            }
        }
        const filtered = events.filter((event) => this.matchesFilter(event, filter));
        filtered.sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));
        if (limit && limit > 0 && filtered.length > limit) {
            return filtered.slice(filtered.length - limit);
        }
        return filtered;
    }
    buildTimeline(events) {
        return events.map((event, index) => ({
            timestamp: new Date(event.timestamp).toISOString(),
            actor: event.actor,
            action: event.action,
            resource: event.resource,
            system: event.system,
            label: `${event.actor} ${event.action} ${event.resource}`.trim(),
            visual: timelineVisual(index, event),
        }));
    }
    maybeDetectAnomalies(events, context) {
        if (!this.can(context, 'viewAnomalies')) {
            return [];
        }
        return this.detectAnomalies(events);
    }
    detectAnomalies(events) {
        if (events.length === 0) {
            return [];
        }
        const anomalies = [];
        const byActor = new Map();
        for (const event of events) {
            const list = byActor.get(event.actor) ?? [];
            list.push(event);
            byActor.set(event.actor, list);
        }
        const averageActor = events.length / Math.max(byActor.size, 1);
        byActor.forEach((list, actor) => {
            if (list.length >= this.anomalyMinEvents &&
                list.length > averageActor * this.anomalyMultiplier) {
                const firstTs = parseTimestamp(list[0].timestamp);
                const lastTs = parseTimestamp(list[list.length - 1].timestamp);
                const spanMinutes = !Number.isNaN(firstTs) && !Number.isNaN(lastTs)
                    ? Math.max((lastTs - firstTs) / MINUTE_IN_MS, 1)
                    : list.length;
                const score = list.length / Math.max(averageActor, 1);
                anomalies.push({
                    reason: `Actor ${actor} generated ${list.length} events (${score.toFixed(1)}x avg) within ${spanMinutes.toFixed(1)} minutes`,
                    score,
                    events: list.map(cloneEvent),
                    actor,
                });
            }
        });
        const bySystem = new Map();
        for (const event of events) {
            const list = bySystem.get(event.system) ?? [];
            list.push(event);
            bySystem.set(event.system, list);
        }
        const averageSystem = events.length / Math.max(bySystem.size, 1);
        bySystem.forEach((list, system) => {
            if (list.length >= this.anomalyMinEvents &&
                list.length > averageSystem * this.anomalyMultiplier) {
                const score = list.length / Math.max(averageSystem, 1);
                anomalies.push({
                    reason: `System ${system} produced ${list.length} events (${score.toFixed(1)}x avg)`,
                    score,
                    events: list.map(cloneEvent),
                    system,
                });
            }
        });
        anomalies.sort((a, b) => b.score - a.score);
        return anomalies;
    }
    correlateEvents(events) {
        const correlations = new Map();
        for (const event of events) {
            for (const key of correlationKeys(event)) {
                if (!key) {
                    continue;
                }
                const entry = correlations.get(key) ?? {
                    systems: new Set(),
                    events: [],
                };
                entry.systems.add(event.system);
                entry.events.push(cloneEvent(event));
                correlations.set(key, entry);
            }
        }
        return Array.from(correlations.entries())
            .filter(([, value]) => value.systems.size > 1 || value.events.length > 1)
            .map(([key, value]) => ({
            key,
            systems: Array.from(value.systems),
            events: value.events,
        }))
            .sort((a, b) => b.events.length - a.events.length);
    }
    describeOptimization(filter, events, limit) {
        const indices = [];
        if (filter.actors && filter.actors.length) {
            indices.push('actor');
        }
        if (filter.actions && filter.actions.length) {
            indices.push('action');
        }
        if (filter.resources && filter.resources.length) {
            indices.push('resource');
        }
        if (filter.systems && filter.systems.length) {
            indices.push('system');
        }
        if (filter.categories && filter.categories.length) {
            indices.push('category');
        }
        if (filter.severities && filter.severities.length) {
            indices.push('severity');
        }
        if (filter.correlationIds && filter.correlationIds.length) {
            indices.push('correlation');
        }
        if (filter.from || filter.to) {
            indices.push('timestamp');
        }
        const parts = [`sources(${this.dataSources.length})`];
        parts.push(`filter[${indices.length ? indices.join(',') : 'full-scan'}]`);
        parts.push('sort[timestamp]');
        if (limit && limit > 0) {
            parts.push(`limit(${limit})`);
        }
        parts.push(`results(${events.length})`);
        return parts.join(' -> ');
    }
    buildExport(events, format) {
        if (format === 'json') {
            return JSON.stringify(events, null, 2);
        }
        const headers = [
            'id',
            'timestamp',
            'actor',
            'action',
            'resource',
            'system',
            'category',
            'severity',
            'correlation_ids',
            'metadata',
        ];
        const rows = [headers.join(',')];
        for (const event of events) {
            const metadataString = event.metadata
                ? JSON.stringify(event.metadata)
                : '';
            const row = [
                event.id,
                event.timestamp,
                event.actor,
                event.action,
                event.resource,
                event.system,
                event.category ?? '',
                event.severity ?? '',
                (event.correlationIds ?? []).join('|'),
                metadataString,
            ]
                .map((value) => {
                const text = String(value ?? '');
                return `"${text.replace(/"/g, '""')}"`;
            })
                .join(',');
            rows.push(row);
        }
        return rows.join('\n');
    }
    recordInvestigation(context, filter, options, result) {
        const entry = {
            id: result.queryId,
            investigator: {
                tenantId: context.tenantId,
                userId: context.userId,
                sessionId: context.sessionId,
                roles: [...context.roles],
            },
            query: {
                filter: { ...filter },
                options: { ...options },
            },
            executedAt: result.executedAt,
            resultSummary: {
                events: result.events.length,
                anomalies: result.anomalies.length,
                correlations: result.correlations.length,
            },
        };
        this.trail.push(entry);
        if (this.trail.length > 200) {
            this.trail.splice(0, this.trail.length - 200);
        }
    }
    cacheKey(filter, options) {
        return JSON.stringify({
            filter,
            limit: options.limit,
            includeTimeline: options.includeTimeline,
            includeAnomalies: options.includeAnomalies,
            includeCorrelations: options.includeCorrelations,
            exportFormat: options.exportFormat,
            optimize: options.optimize,
            naturalLanguage: options.naturalLanguage,
        });
    }
    readCache(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt < this.now().getTime()) {
            this.cache.delete(key);
            const index = this.cacheOrder.indexOf(key);
            if (index >= 0) {
                this.cacheOrder.splice(index, 1);
            }
            return undefined;
        }
        return cloneResult(entry.result, true);
    }
    writeCache(key, result) {
        this.pruneCache();
        const entry = {
            expiresAt: this.now().getTime() + this.cacheTtlMs,
            result: cloneResult(result, false),
        };
        this.cache.set(key, entry);
        this.cacheOrder.push(key);
        if (this.cacheOrder.length > this.maxCacheEntries) {
            const oldest = this.cacheOrder.shift();
            if (oldest) {
                this.cache.delete(oldest);
            }
        }
    }
    pruneCache() {
        const nowTs = this.now().getTime();
        for (const key of [...this.cacheOrder]) {
            const entry = this.cache.get(key);
            if (entry && entry.expiresAt < nowTs) {
                this.cache.delete(key);
                const index = this.cacheOrder.indexOf(key);
                if (index >= 0) {
                    this.cacheOrder.splice(index, 1);
                }
            }
        }
    }
    buildRoleMatrix(overrides) {
        const matrix = {
            viewer: { ...DEFAULT_ROLE_MATRIX.viewer },
            analyst: { ...DEFAULT_ROLE_MATRIX.analyst },
            admin: { ...DEFAULT_ROLE_MATRIX.admin },
        };
        if (overrides) {
            for (const [role, capabilities] of Object.entries(overrides)) {
                const castRole = role;
                const base = matrix[castRole] ?? FALLBACK_CAPABILITIES;
                matrix[castRole] = { ...base, ...capabilities };
            }
        }
        return matrix;
    }
    can(context, capability) {
        return context.roles.some((role) => {
            const capabilities = this.roleMatrix[role] ?? FALLBACK_CAPABILITIES;
            return capabilities[capability];
        });
    }
    ensureAuthorized(context, capability) {
        if (!this.can(context, capability)) {
            throw new Error(`Not authorized to ${capability} audit data`);
        }
    }
}
exports.AuditInvestigationPlatform = AuditInvestigationPlatform;
function simpleLedgerDataSource(system, ledger) {
    return {
        system,
        load: () => ledger.list().map((entry) => convertSimpleLedgerEntry(entry, system)),
    };
}
function cursorLedgerDataSource(system, ledger) {
    return {
        system,
        load: () => ledger.list().map((record) => convertCursorRecord(record, system)),
    };
}
__exportStar(require("./manifest.js"), exports);
