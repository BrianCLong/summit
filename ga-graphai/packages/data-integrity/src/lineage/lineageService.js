"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineageService = void 0;
const eventLog_js_1 = require("../eventlog/eventLog.js");
const canonicalizer_js_1 = require("../canonical/canonicalizer.js");
function assertMetadata(metadata) {
    if (!metadata.origin || metadata.origin.trim().length === 0) {
        throw new Error('Provenance origin is required for every artifact');
    }
    if (Number.isNaN(metadata.confidence) || metadata.confidence < 0 || metadata.confidence > 1) {
        throw new Error('Provenance confidence must be between 0 and 1');
    }
    if (typeof metadata.isSimulated !== 'boolean') {
        throw new Error('Provenance must explicitly declare isSimulated');
    }
    if (!metadata.observedAt || Number.isNaN(Date.parse(metadata.observedAt))) {
        throw new Error('Provenance observedAt must be an ISO-8601 timestamp');
    }
}
class LineageService {
    scope;
    artifacts = new Map();
    outputEventByArtifact = new Map();
    consumerEventsByArtifact = new Map();
    events = new Map();
    ledger;
    constructor(scope = 'lineage') {
        this.scope = scope;
        this.ledger = new eventLog_js_1.EventLog();
    }
    registerArtifact(artifact) {
        assertMetadata(artifact.metadata);
        if (this.artifacts.has(artifact.id)) {
            throw new Error(`Artifact ${artifact.id} is already registered`);
        }
        const timestamp = artifact.metadata.observedAt;
        const eventId = `register-${artifact.id}`;
        const canonicalArtifact = { ...artifact };
        this.artifacts.set(artifact.id, canonicalArtifact);
        this.events.set(eventId, {
            id: eventId,
            operation: 'register',
            inputs: [],
            outputs: [canonicalArtifact],
            timestamp,
        });
        this.outputEventByArtifact.set(artifact.id, eventId);
        this.ledger.append({
            id: eventId,
            type: 'lineage-register',
            scope: this.scope,
            actor: 'system',
            timestamp,
            payload: {
                artifactId: artifact.id,
                metadata: artifact.metadata,
                payloadHash: (0, canonicalizer_js_1.stableHash)(artifact.payload),
            },
        });
        return canonicalArtifact;
    }
    recordTransformation(event) {
        const timestamp = event.timestamp ?? new Date().toISOString();
        for (const input of event.inputs) {
            if (!this.artifacts.has(input)) {
                throw new Error(`Input artifact ${input} is not registered`);
            }
        }
        const normalizedOutputs = event.outputs.map((output) => {
            assertMetadata(output.metadata);
            const envelope = { ...output };
            this.artifacts.set(envelope.id, envelope);
            this.outputEventByArtifact.set(envelope.id, event.id);
            return envelope;
        });
        const storedEvent = {
            ...event,
            outputs: normalizedOutputs,
            timestamp,
        };
        this.events.set(event.id, storedEvent);
        for (const input of event.inputs) {
            if (!this.consumerEventsByArtifact.has(input)) {
                this.consumerEventsByArtifact.set(input, new Set());
            }
            this.consumerEventsByArtifact.get(input).add(event.id);
        }
        this.ledger.append({
            id: event.id,
            type: 'lineage-transformation',
            scope: this.scope,
            actor: event.actor ?? 'system',
            timestamp,
            payload: {
                operation: event.operation,
                inputs: event.inputs,
                outputs: normalizedOutputs.map((output) => ({
                    id: output.id,
                    metadata: output.metadata,
                    payloadHash: (0, canonicalizer_js_1.stableHash)(output.payload),
                })),
                notes: event.notes,
            },
        });
        return storedEvent;
    }
    trace(itemId, direction = 'both') {
        if (!this.artifacts.has(itemId)) {
            throw new Error(`Artifact ${itemId} is not registered`);
        }
        const visited = new Set();
        const edges = [];
        const queue = [itemId];
        visited.add(itemId);
        while (queue.length > 0) {
            const current = queue.shift();
            if (direction === 'backward' || direction === 'both') {
                const producerEventId = this.outputEventByArtifact.get(current);
                if (producerEventId) {
                    const producer = this.events.get(producerEventId);
                    if (producer) {
                        for (const input of producer.inputs) {
                            edges.push({ from: input, to: current, via: producer.id });
                            if (!visited.has(input)) {
                                visited.add(input);
                                queue.push(input);
                            }
                        }
                    }
                }
            }
            if (direction === 'forward' || direction === 'both') {
                const consumerEvents = this.consumerEventsByArtifact.get(current);
                if (consumerEvents) {
                    for (const consumerEventId of consumerEvents) {
                        const consumer = this.events.get(consumerEventId);
                        if (!consumer)
                            continue;
                        for (const output of consumer.outputs) {
                            edges.push({ from: current, to: output.id, via: consumer.id });
                            if (!visited.has(output.id)) {
                                visited.add(output.id);
                                queue.push(output.id);
                            }
                        }
                    }
                }
            }
        }
        const nodes = Array.from(visited);
        const artifacts = {};
        for (const node of nodes) {
            artifacts[node] = this.artifacts.get(node);
        }
        const parents = new Map();
        const children = new Map();
        for (const edge of edges) {
            if (!parents.has(edge.to))
                parents.set(edge.to, new Set());
            parents.get(edge.to).add(edge.from);
            if (!children.has(edge.from))
                children.set(edge.from, new Set());
            children.get(edge.from).add(edge.to);
        }
        const roots = nodes.filter((node) => (parents.get(node)?.size ?? 0) === 0);
        const leaves = nodes.filter((node) => (children.get(node)?.size ?? 0) === 0);
        return { nodes, edges, roots, leaves, artifacts };
    }
    auditTrail(itemId) {
        const trace = this.trace(itemId, 'both');
        const verification = this.ledger.verify(this.scope);
        const ledger = this.ledger.list(0, Number.MAX_SAFE_INTEGER);
        return { trace, verification, ledger };
    }
}
exports.LineageService = LineageService;
