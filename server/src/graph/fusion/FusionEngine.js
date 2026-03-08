"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionEngine = void 0;
// @ts-nocheck
const store_js_1 = require("../store.js");
const EntityResolution_js_1 = require("./EntityResolution.js");
class FusionEngine {
    store;
    er;
    constructor() {
        this.store = new store_js_1.GraphStore();
        this.er = new EntityResolution_js_1.EntityResolutionService();
    }
    async ingest(payload) {
        const { source, tenantId, entities, relationships } = payload;
        const idMap = new Map(); // Map externalId -> globalId
        // 1. Process Entities
        for (const entity of entities) {
            const resolution = await this.er.resolve(tenantId, entity.entityType, entity.externalId, source, { name: entity.name, ...entity.attributes });
            idMap.set(entity.externalId, resolution.globalId);
            const graphNode = {
                globalId: resolution.globalId,
                tenantId,
                entityType: entity.entityType,
                attributes: {
                    ...entity.attributes,
                    name: entity.name
                },
                sourceRefs: [{
                        provider: source,
                        externalId: entity.externalId,
                        ingestedAt: new Date().toISOString()
                    }],
                epistemic: {
                    status: 'observed_fact',
                    confidence: 1.0,
                    sourceTrust: 1.0, // Should be config based
                    recencyScore: 1.0,
                    riskClassification: 'benign'
                }
            };
            await this.store.upsertNode(graphNode);
        }
        // 2. Process Relationships
        for (const rel of relationships) {
            const sourceGlobalId = idMap.get(rel.sourceExternalId);
            const targetGlobalId = idMap.get(rel.targetExternalId);
            if (sourceGlobalId && targetGlobalId) {
                await this.store.upsertEdge({
                    sourceId: sourceGlobalId,
                    targetId: targetGlobalId,
                    edgeType: rel.edgeType,
                    tenantId,
                    attributes: rel.attributes || {},
                    sourceRefs: [{
                            provider: source,
                            externalId: `${rel.sourceExternalId}->${rel.targetExternalId}`, // logical ID
                            ingestedAt: new Date().toISOString()
                        }]
                });
            }
            else {
                console.warn(`Skipping edge ${rel.edgeType}: unresolved nodes ${rel.sourceExternalId} -> ${rel.targetExternalId}`);
            }
        }
    }
}
exports.FusionEngine = FusionEngine;
