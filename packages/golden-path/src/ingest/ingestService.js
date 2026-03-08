"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryIngestStore = void 0;
exports.buildProvenance = buildProvenance;
const node_crypto_1 = require("node:crypto");
const residency_js_1 = require("../governance/residency.js");
class InMemoryIngestStore {
    entities = new Map();
    relationships = new Map();
    events = new Map();
    ingestedKeys = new Set();
    auditTrail = [];
    ingest(request, allowedResidency) {
        const key = request.idempotencyKey ?? this.computeKey(request);
        if (this.ingestedKeys.has(key)) {
            this.auditTrail.push({
                timestamp: new Date().toISOString(),
                message: 'Duplicate ingest blocked',
                context: { key },
            });
            return;
        }
        (0, residency_js_1.enforceResidency)(request.entity.tags, allowedResidency, this.auditTrail);
        this.entities.set(request.entity.id, request.entity);
        if (request.relationships) {
            for (const rel of request.relationships) {
                (0, residency_js_1.enforceResidency)(rel.tags, allowedResidency, this.auditTrail);
                this.relationships.set(rel.id, rel);
            }
        }
        if (request.events) {
            for (const event of request.events) {
                (0, residency_js_1.enforceResidency)(event.tags, allowedResidency, this.auditTrail);
                this.events.set(event.id, event);
            }
        }
        this.ingestedKeys.add(key);
        this.auditTrail.push({
            timestamp: new Date().toISOString(),
            message: 'Ingest succeeded',
            context: { key, entityId: request.entity.id },
        });
    }
    getAuditTrail() {
        return [...this.auditTrail];
    }
    getTimeline(filter) {
        return [...this.events.values()]
            .filter((event) => {
            if (filter.entityId && event.entityId !== filter.entityId)
                return false;
            if (filter.source && event.source !== filter.source)
                return false;
            if (filter.confidenceGte !== undefined &&
                event.confidence < filter.confidenceGte)
                return false;
            const occurred = new Date(event.occurredAt).getTime();
            if (filter.start && occurred < new Date(filter.start).getTime())
                return false;
            if (filter.end && occurred > new Date(filter.end).getTime())
                return false;
            return true;
        })
            .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
            .map((event) => ({
            id: event.id,
            entityId: event.entityId,
            occurredAt: event.occurredAt,
            source: event.source,
            confidence: event.confidence,
            provenance: event.provenance,
            payload: event.payload,
        }));
    }
    computeKey(request) {
        const hash = (0, node_crypto_1.createHash)('sha256');
        hash.update(JSON.stringify(request));
        return hash.digest('hex');
    }
}
exports.InMemoryIngestStore = InMemoryIngestStore;
function buildProvenance(source, schemaVersion) {
    const ingestedAt = new Date().toISOString();
    const hash = (0, node_crypto_1.createHash)('sha256').update(`${source}-${ingestedAt}`).digest('hex');
    return {
        id: (0, node_crypto_1.randomUUID)(),
        ingestedAt,
        hash,
        schemaVersion,
    };
}
