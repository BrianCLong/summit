"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaContextOrchestrator = void 0;
const crypto_1 = require("crypto");
const node_perf_hooks_1 = require("node:perf_hooks");
const telemetry_js_1 = require("./telemetry.js");
function nowIso() {
    return new Date().toISOString();
}
function unique(values) {
    return Array.from(new Set(values));
}
class ContextLedger {
    deltas = [];
    record(delta) {
        this.deltas.push(delta);
        return delta;
    }
    all() {
        return [...this.deltas];
    }
}
class ContextGraph {
    nodes = new Map();
    upsert(node) {
        const supersedes = node.supersedes ?? [];
        for (const id of supersedes) {
            const superseded = this.nodes.get(id);
            if (superseded) {
                this.nodes.set(id, { ...superseded, supersededBy: node.id });
            }
        }
        const normalized = {
            ...node,
            supersedes: unique(supersedes),
            supersededBy: node.supersededBy ?? null,
        };
        this.nodes.set(node.id, normalized);
        return normalized;
    }
    supersede(targetId, replacement) {
        const superseded = this.nodes.get(targetId);
        if (superseded) {
            this.nodes.set(targetId, { ...superseded, supersededBy: replacement.id });
        }
        return this.upsert(replacement);
    }
    activeNodes() {
        return [...this.nodes.values()].filter((node) => !node.supersededBy);
    }
}
class MetaContextOrchestrator {
    telemetry;
    constructor(telemetry = telemetry_js_1.metaOrchestratorTelemetry) {
        this.telemetry = telemetry;
    }
    graph = new ContextGraph();
    ledger = new ContextLedger();
    registerNode(node) {
        const id = node.id ?? (0, crypto_1.randomUUID)();
        const provenance = node.provenance ?? {
            source: 'unknown',
            timestamp: nowIso(),
        };
        const normalized = {
            ...node,
            id,
            provenance,
            affordances: node.affordances ?? [],
            supersedes: node.supersedes ?? [],
            supersededBy: node.supersededBy ?? null,
        };
        const stored = this.graph.upsert(normalized);
        this.telemetry.recordNode(normalized.kind, normalized.layer);
        this.ledger.record({
            id: (0, crypto_1.randomUUID)(),
            kind: normalized.supersedes?.length ? 'supersede' : 'add',
            summary: normalized.title ?? normalized.kind,
            timestamp: nowIso(),
            author: provenance.author,
            linkedNodeIds: [stored.id, ...(normalized.supersedes ?? [])],
            payload: { layer: normalized.layer, tags: normalized.tags ?? [] },
        });
        return stored;
    }
    recordDelta(delta) {
        const normalized = {
            ...delta,
            id: delta.id ?? (0, crypto_1.randomUUID)(),
            timestamp: delta.timestamp ?? nowIso(),
            linkedNodeIds: delta.linkedNodeIds ?? [],
        };
        this.telemetry.recordDelta(normalized.kind);
        this.ledger.record(normalized);
        return normalized;
    }
    assemble(request) {
        const startedAt = node_perf_hooks_1.performance.now();
        const includeLayers = request.includeLayers ?? ['local', 'task', 'world', 'agent'];
        const includeKinds = request.includeKinds ?? [];
        const excludeKinds = new Set(request.excludeKinds ?? []);
        const requiredAffordances = request.requiredAffordances ?? [];
        const activeNodes = this.graph
            .activeNodes()
            .filter((node) => includeLayers.includes(node.layer))
            .filter((node) => (includeKinds.length === 0 ? true : includeKinds.includes(node.kind)))
            .filter((node) => !excludeKinds.has(node.kind))
            .filter((node) => requiredAffordances.every((affordance) => node.affordances.includes(affordance)));
        this.enforceContract(activeNodes, request.contract, request.strict ?? false);
        const assembled = {
            goal: request.goal,
            assembledAt: nowIso(),
            nodes: activeNodes,
            deltas: this.ledger.all(),
        };
        this.telemetry.recordAssembly(request.goal, activeNodes.length, assembled.deltas.length, node_perf_hooks_1.performance.now() - startedAt);
        return assembled;
    }
    enforceContract(nodes, contract, strict = false) {
        if (!contract) {
            return;
        }
        if (contract.layerAllowlist) {
            const invalid = nodes.filter((node) => !contract.layerAllowlist?.includes(node.layer));
            if (invalid.length > 0) {
                throw new Error(`Contract violation: disallowed layers ${invalid.map((node) => node.layer).join(',')}`);
            }
        }
        if (contract.forbiddenKinds) {
            const forbidden = nodes.filter((node) => contract.forbiddenKinds?.includes(node.kind));
            if (forbidden.length > 0) {
                throw new Error(`Contract violation: forbidden kinds ${forbidden.map((node) => node.kind).join(',')}`);
            }
        }
        if (contract.forbiddenTags && contract.forbiddenTags.length > 0) {
            const forbiddenNodes = nodes.filter((node) => (node.tags ?? []).some((tag) => contract.forbiddenTags?.includes(tag)));
            if (forbiddenNodes.length > 0) {
                throw new Error(`Contract violation: forbidden tags present on ${forbiddenNodes.map((node) => node.id).join(',')}`);
            }
        }
        if (contract.requiredKinds && strict) {
            for (const required of contract.requiredKinds) {
                if (!nodes.some((node) => node.kind === required)) {
                    throw new Error(`Contract violation: missing required kind ${required}`);
                }
            }
        }
        if (contract.requiredTags && strict) {
            for (const tag of contract.requiredTags) {
                if (!nodes.some((node) => (node.tags ?? []).includes(tag))) {
                    throw new Error(`Contract violation: missing required tag ${tag}`);
                }
            }
        }
        if (contract.maxNodes && nodes.length > contract.maxNodes) {
            throw new Error(`Contract violation: assembled context exceeds maximum nodes (${nodes.length}/${contract.maxNodes})`);
        }
    }
}
exports.MetaContextOrchestrator = MetaContextOrchestrator;
