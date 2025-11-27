import { GraphStore } from '../store.js';
import { EntityResolutionService } from './EntityResolution.js';
import { FusionPayload } from './types.js';
import { GraphEntity, EpistemicStatus } from '../types.js';

export class FusionEngine {
  private store: GraphStore;
  private er: EntityResolutionService;

  constructor() {
    this.store = new GraphStore();
    this.er = new EntityResolutionService();
  }

  async ingest(payload: FusionPayload): Promise<void> {
    const { source, tenantId, entities, relationships } = payload;
    const idMap = new Map<string, string>(); // Map externalId -> globalId

    // 1. Process Entities
    for (const entity of entities) {
      const resolution = await this.er.resolve(
        tenantId,
        entity.entityType,
        entity.externalId,
        source,
        { name: entity.name, ...entity.attributes }
      );

      idMap.set(entity.externalId, resolution.globalId);

      const graphNode: any = {
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
          status: 'observed_fact' as EpistemicStatus,
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
      } else {
        console.warn(`Skipping edge ${rel.edgeType}: unresolved nodes ${rel.sourceExternalId} -> ${rel.targetExternalId}`);
      }
    }
  }
}
