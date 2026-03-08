"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentStateReconciler = void 0;
const node_events_1 = require("node:events");
const node_crypto_1 = require("node:crypto");
const DEFAULT_STATUS_ORDER = [
    'denied',
    'revoked',
    'expired',
    'granted',
];
function composeSubjectKey(subjectId, policyId) {
    return `${subjectId}::${policyId}`;
}
function composeSourceKey(source) {
    const endpoint = source.endpoint ?? '*';
    const environment = source.environment ?? '*';
    const topology = source.topologyPath?.join('/') ?? '*';
    return `${source.domain}::${source.service}::${endpoint}::${environment}::${topology}`;
}
function cloneState(state) {
    return {
        ...state,
        scopes: [...state.scopes],
        overrides: state.overrides ? [...state.overrides] : undefined,
        metadata: state.metadata ? { ...state.metadata } : undefined,
    };
}
function cloneSource(source) {
    return {
        ...source,
        topologyPath: source.topologyPath ? [...source.topologyPath] : undefined,
    };
}
function cloneEnvelope(envelope) {
    return {
        state: cloneState(envelope.state),
        source: cloneSource(envelope.source),
        policyBinding: { ...envelope.policyBinding },
        evidence: envelope.evidence ? [...envelope.evidence] : undefined,
    };
}
function cloneConflict(conflict) {
    return {
        ...conflict,
        candidates: conflict.candidates.map((candidate) => cloneEnvelope(candidate)),
        resolvedState: conflict.resolvedState
            ? cloneState(conflict.resolvedState)
            : undefined,
    };
}
function cloneResolution(resolution) {
    return {
        finalState: cloneState(resolution.finalState),
        conflict: resolution.conflict
            ? cloneConflict(resolution.conflict)
            : undefined,
        adoptedFrom: cloneSource(resolution.adoptedFrom),
        appliedOverrides: [...resolution.appliedOverrides],
    };
}
function canonicalizeScopes(scopes) {
    return [...scopes].sort().join('|');
}
function calculateStatusPriority(status, priority, fallback) {
    return priority.get(status) ?? fallback;
}
class ConsentStateReconciler {
    config;
    statusOrder;
    statusPriority;
    conflictStrategy;
    sourceWeights;
    clock;
    pools = new Map();
    resolutions = new Map();
    conflicts = new Map();
    auditLog = [];
    modules = new Map();
    events = new node_events_1.EventEmitter();
    constructor(config = {}) {
        this.config = config;
        this.statusOrder = config.strictStatusOrder ?? DEFAULT_STATUS_ORDER;
        this.statusPriority = new Map(this.statusOrder.map((status, index) => [status, index]));
        this.conflictStrategy = config.conflictStrategy ?? 'prefer-strictest';
        this.sourceWeights = config.sourceWeights ?? {};
        this.clock = config.clock ?? (() => new Date());
    }
    registerModule(module) {
        this.modules.set(module.name, module);
        return () => {
            this.modules.delete(module.name);
        };
    }
    async ingest(envelope) {
        const key = composeSubjectKey(envelope.state.subjectId, envelope.state.policyId);
        const pool = this.pools.get(key) ?? new Map();
        pool.set(composeSourceKey(envelope.source), cloneEnvelope(envelope));
        this.pools.set(key, pool);
        this.recordAudit('ingest', envelope.state.subjectId, envelope.state.policyId, {
            source: envelope.source,
            status: envelope.state.status,
            version: envelope.state.version,
        });
        const candidates = [...pool.values()];
        const conflict = this.createConflict(candidates);
        if (conflict) {
            this.conflicts.set(key, conflict);
            this.recordAudit('conflict-generated', conflict.subjectId, conflict.policyId, {
                severity: conflict.severity,
                reason: conflict.reason,
                candidateCount: conflict.candidates.length,
            });
        }
        else {
            this.conflicts.delete(key);
        }
        const resolution = this.createResolution(candidates, conflict);
        this.resolutions.set(key, resolution);
        this.recordAudit('auto-resolution', resolution.finalState.subjectId, resolution.finalState.policyId, {
            adoptedFrom: resolution.adoptedFrom,
            status: resolution.finalState.status,
            appliedOverrides: resolution.appliedOverrides,
        });
        await this.syncModules(resolution);
        const broadcast = cloneResolution(resolution);
        this.events.emit('resolution', broadcast);
        return broadcast;
    }
    getResolution(subjectId, policyId) {
        const resolution = this.resolutions.get(composeSubjectKey(subjectId, policyId));
        return resolution ? cloneResolution(resolution) : undefined;
    }
    getConflict(subjectId, policyId) {
        const conflict = this.conflicts.get(composeSubjectKey(subjectId, policyId));
        return conflict ? cloneConflict(conflict) : undefined;
    }
    listConflicts() {
        return Array.from(this.conflicts.values()).map((current) => cloneConflict(current));
    }
    getAuditLog() {
        return this.auditLog.map((record) => ({
            ...record,
            details: { ...record.details },
        }));
    }
    getTopologySnapshot() {
        const tallies = new Map();
        for (const resolution of this.resolutions.values()) {
            const adoptedFrom = resolution.adoptedFrom;
            const nodeKey = composeSourceKey(adoptedFrom);
            let node = tallies.get(nodeKey);
            if (!node) {
                node = {
                    domain: adoptedFrom.domain,
                    service: adoptedFrom.service,
                    endpoint: adoptedFrom.endpoint,
                    environment: adoptedFrom.environment,
                    topologyPath: adoptedFrom.topologyPath
                        ? [...adoptedFrom.topologyPath]
                        : undefined,
                    totalSubjects: 0,
                    statuses: { granted: 0, denied: 0, revoked: 0, expired: 0 },
                };
                tallies.set(nodeKey, node);
            }
            node.totalSubjects += 1;
            node.statuses[resolution.finalState.status] += 1;
        }
        const nodes = Array.from(tallies.values()).map((node) => ({
            domain: node.domain,
            service: node.service,
            endpoint: node.endpoint,
            environment: node.environment,
            topologyPath: node.topologyPath ? [...node.topologyPath] : undefined,
            totalSubjects: node.totalSubjects,
            statuses: { ...node.statuses },
        }));
        return {
            generatedAt: this.clock().toISOString(),
            nodes,
        };
    }
    subscribe(listener) {
        const handler = (resolution) => listener(cloneResolution(resolution));
        this.events.on('resolution', handler);
        return () => {
            this.events.off('resolution', handler);
        };
    }
    async runValidation(scenarios) {
        const entries = [];
        for (const scenario of scenarios) {
            const harness = new ConsentStateReconciler(this.config);
            for (const module of this.modules.values()) {
                harness.registerModule(module);
            }
            for (const setup of scenario.setup) {
                await harness.ingest(setup);
            }
            const expectation = scenario.expectation;
            const resolution = harness.getResolution(expectation.subjectId, expectation.policyId);
            const conflict = harness.getConflict(expectation.subjectId, expectation.policyId);
            const actualStatus = resolution?.finalState.status;
            const actualConflicts = conflict ? 1 : 0;
            const expectedConflicts = expectation.expectedConflicts ?? actualConflicts;
            const passed = actualStatus === expectation.expectedStatus &&
                actualConflicts === expectedConflicts;
            entries.push({
                scenarioId: scenario.id,
                passed,
                actualStatus,
                actualConflicts,
                details: {
                    description: scenario.description,
                    expectedStatus: expectation.expectedStatus,
                    expectedConflicts,
                    notes: scenario.notes,
                },
            });
            this.recordAudit('validation', expectation.subjectId, expectation.policyId, {
                scenarioId: scenario.id,
                passed,
                actualStatus,
                actualConflicts,
            });
        }
        return {
            generatedAt: this.clock().toISOString(),
            scenarios: entries,
        };
    }
    createConflict(candidates) {
        if (candidates.length <= 1) {
            return undefined;
        }
        const statusSet = new Set();
        const scopeSet = new Set();
        const jurisdictionSet = new Set();
        const versionSet = new Set();
        for (const candidate of candidates) {
            statusSet.add(candidate.state.status);
            scopeSet.add(canonicalizeScopes(candidate.state.scopes));
            jurisdictionSet.add(candidate.state.jurisdiction);
            versionSet.add(candidate.state.version);
        }
        const statusMismatch = statusSet.size > 1;
        const scopeMismatch = scopeSet.size > 1;
        const jurisdictionMismatch = jurisdictionSet.size > 1;
        const versionMismatch = versionSet.size > 1;
        if (!statusMismatch &&
            !scopeMismatch &&
            !jurisdictionMismatch &&
            !versionMismatch) {
            return undefined;
        }
        const reasonParts = [];
        if (statusMismatch) {
            reasonParts.push(`status mismatch: ${Array.from(statusSet).join(' vs ')}`);
        }
        if (scopeMismatch) {
            reasonParts.push('scope divergence across sources');
        }
        if (jurisdictionMismatch) {
            reasonParts.push('jurisdiction mismatch');
        }
        if (versionMismatch) {
            reasonParts.push('policy version skew');
        }
        const severity = statusMismatch
            ? 'error'
            : scopeMismatch
                ? 'warning'
                : 'info';
        return {
            subjectId: candidates[0].state.subjectId,
            policyId: candidates[0].state.policyId,
            severity,
            reason: reasonParts.join('; '),
            candidates: candidates.map((candidate) => cloneEnvelope(candidate)),
        };
    }
    createResolution(candidates, conflict) {
        const selected = this.selectCandidate(candidates);
        const finalState = cloneState(selected.state);
        const adoptedFrom = cloneSource(selected.source);
        const resolution = {
            finalState,
            conflict: conflict
                ? { ...conflict, resolvedState: finalState }
                : undefined,
            adoptedFrom,
            appliedOverrides: selected.state.overrides
                ? [...selected.state.overrides]
                : [],
        };
        return resolution;
    }
    selectCandidate(candidates) {
        if (candidates.length === 1) {
            return candidates[0];
        }
        const ranked = candidates.slice();
        switch (this.conflictStrategy) {
            case 'prefer-latest':
                ranked.sort((a, b) => this.compareLatest(a, b));
                break;
            case 'prefer-source-weight':
                ranked.sort((a, b) => {
                    const weightDiff = this.getSourceWeight(b.source) - this.getSourceWeight(a.source);
                    if (weightDiff !== 0) {
                        return weightDiff;
                    }
                    return this.compareStrictest(a, b);
                });
                break;
            case 'prefer-strictest':
            default:
                ranked.sort((a, b) => this.compareStrictest(a, b));
                break;
        }
        return ranked[0];
    }
    compareStrictest(a, b) {
        const fallback = this.statusOrder.length;
        const priorityDiff = calculateStatusPriority(a.state.status, this.statusPriority, fallback) -
            calculateStatusPriority(b.state.status, this.statusPriority, fallback);
        if (priorityDiff !== 0) {
            return priorityDiff;
        }
        if (b.state.version !== a.state.version) {
            return b.state.version - a.state.version;
        }
        return (new Date(b.state.updatedAt).getTime() -
            new Date(a.state.updatedAt).getTime());
    }
    compareLatest(a, b) {
        const updatedDiff = new Date(b.state.updatedAt).getTime() -
            new Date(a.state.updatedAt).getTime();
        if (updatedDiff !== 0) {
            return updatedDiff;
        }
        return b.state.version - a.state.version;
    }
    getSourceWeight(source) {
        const directKey = composeSourceKey(source);
        if (directKey in this.sourceWeights) {
            return this.sourceWeights[directKey] ?? 0;
        }
        return this.sourceWeights[source.domain] ?? 0;
    }
    recordAudit(action, subjectId, policyId, details) {
        this.auditLog.push({
            eventId: (0, node_crypto_1.randomUUID)(),
            timestamp: this.clock().toISOString(),
            action,
            subjectId,
            policyId,
            details,
        });
    }
    async syncModules(resolution) {
        if (this.modules.size === 0) {
            return;
        }
        const invoked = [];
        const tasks = [];
        for (const module of this.modules.values()) {
            if (module.supportedDomains.length > 0 &&
                !module.supportedDomains.includes(resolution.adoptedFrom.domain)) {
                continue;
            }
            invoked.push(module.name);
            const result = module.sync(cloneResolution(resolution), this.getAuditLog());
            if (result instanceof Promise) {
                tasks.push(result);
            }
        }
        if (tasks.length > 0) {
            await Promise.all(tasks);
        }
        if (invoked.length > 0) {
            this.recordAudit('module-sync', resolution.finalState.subjectId, resolution.finalState.policyId, {
                modules: invoked,
            });
        }
    }
}
exports.ConsentStateReconciler = ConsentStateReconciler;
