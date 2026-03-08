"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphUpdater = void 0;
// @ts-nocheck
const store_js_1 = require("../graph/store.js");
const uuid_1 = require("uuid");
class GraphUpdater {
    store;
    constructor(store) {
        this.store = store || new store_js_1.GraphStore();
    }
    /**
     * Incrementally updates the knowledge graph with new entities and relationships.
     * Handles conflict resolution by merging attributes and updating confidence scores.
     */
    async updateGraph(tenantId, entities, relationships, sourceId) {
        // 1. Process Entities
        for (const ent of entities) {
            // Determine entity type (mapping NLP label to Graph EntityType)
            const entityType = this.mapLabelToType(ent.type || ent.label || 'CONCEPT');
            const name = ent.canonicalName || ent.text || 'Unknown';
            // Try to resolve existing entity
            // In a real system, we'd use a robust resolution service.
            // Here we use exact name match.
            let existingNode = await this.store.findNodeByAttribute(tenantId, 'name', name);
            const globalId = existingNode ? existingNode.globalId : (0, uuid_1.v4)();
            await this.store.upsertNode({
                globalId,
                tenantId,
                entityType,
                attributes: {
                    name: name,
                    aliases: ent.aliases || [name],
                    confidence: ent.confidence || 0.5,
                    lastSeen: new Date().toISOString()
                },
                sourceRefs: [{
                        sourceId: sourceId,
                        extractedAt: new Date().toISOString(),
                        confidence: ent.confidence
                    }]
            });
        }
        // 2. Process Relationships
        // Note: Relationship resolution is harder because we need the globalIds of subject/object.
        // For this prototype, we re-resolve them or assume we have a map.
        for (const rel of relationships) {
            const subjNode = await this.store.findNodeByAttribute(tenantId, 'name', rel.subject);
            const objNode = await this.store.findNodeByAttribute(tenantId, 'name', rel.object);
            if (subjNode && objNode) {
                await this.store.upsertEdge({
                    sourceId: subjNode.globalId,
                    targetId: objNode.globalId,
                    tenantId,
                    edgeType: types_js_1.EdgeType.RELATED_TO, // specific type mapping needed
                    attributes: {
                        predicate: rel.predicate,
                        confidence: rel.confidence
                    },
                    sourceRefs: [{
                            sourceId: sourceId,
                            extractedAt: new Date().toISOString(),
                            confidence: rel.confidence
                        }]
                });
            }
        }
    }
    mapLabelToType(label) {
        // Simple mapping
        switch (label?.toUpperCase()) {
            case 'PERSON': return types_js_1.EntityType.Person;
            case 'ORG': return types_js_1.EntityType.Organization;
            case 'GPE':
            case 'LOC': return types_js_1.EntityType.Location;
            case 'EVENT': return types_js_1.EntityType.Event;
            default: return types_js_1.EntityType.Concept; // Default
        }
    }
}
exports.GraphUpdater = GraphUpdater;
