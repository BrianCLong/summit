// @ts-nocheck
import { GraphStore } from '../graph/store';
import { EntityType, EdgeType } from '../graph/types';
import { v4 as uuidv4 } from 'uuid';

export class GraphUpdater {
    private store: GraphStore;

    constructor(store?: GraphStore) {
        this.store = store || new GraphStore();
    }

    /**
     * Incrementally updates the knowledge graph with new entities and relationships.
     * Handles conflict resolution by merging attributes and updating confidence scores.
     */
    async updateGraph(
        tenantId: string,
        entities: Array<{ type?: string; label?: string; canonicalName?: string; text?: string; aliases?: string[]; confidence?: number }>,
        relationships: Array<{ subject: string; object: string; predicate: string; confidence: number }>,
        sourceId: string
    ): Promise<void> {

        // 1. Process Entities
        for (const ent of entities) {
            // Determine entity type (mapping NLP label to Graph EntityType)
            const entityType = this.mapLabelToType(ent.type || ent.label || 'CONCEPT');
            const name = ent.canonicalName || ent.text || 'Unknown';

            // Try to resolve existing entity
            // In a real system, we'd use a robust resolution service.
            // Here we use exact name match.
            let existingNode = await this.store.findNodeByAttribute(tenantId, 'name', name);

            const globalId = existingNode ? existingNode.globalId : uuidv4();

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
                     edgeType: EdgeType.RELATED_TO, // specific type mapping needed
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

    private mapLabelToType(label: string): EntityType {
        // Simple mapping
        switch(label?.toUpperCase()) {
            case 'PERSON': return EntityType.Person;
            case 'ORG': return EntityType.Organization;
            case 'GPE':
            case 'LOC': return EntityType.Location;
            case 'EVENT': return EntityType.Event;
            default: return EntityType.Concept; // Default
        }
    }
}
