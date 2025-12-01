/**
 * Knowledge Fusion System
 * Cross-source entity resolution, conflict resolution, and data integration
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

export interface ConflictResolutionStrategy {
  type: 'latest' | 'highest_confidence' | 'majority_vote' | 'source_priority' | 'custom';
  sourcePriority?: string[]; // For source_priority strategy
  customResolver?: (values: any[]) => any; // For custom strategy
}

export interface FusionResult {
  entityId: string;
  mergedProperties: Record<string, any>;
  conflictsResolved: number;
  confidenceScore: number;
  sources: string[];
}

export class KnowledgeFusion {
  constructor(private driver: Driver) {}

  /**
   * Cross-source entity resolution
   * Identify entities that refer to the same real-world object across sources
   */
  async resolveEntitiesAcrossSources(
    sources: string[],
    similarityThreshold = 0.8,
  ): Promise<Array<{ canonicalId: string; matchedEntities: string[] }>> {
    const session = this.driver.session();
    try {
      // Find potentially matching entities across sources
      const result = await session.run(
        `
        MATCH (e1)
        WHERE e1.provenance IS NOT NULL
          AND json_extract(e1.provenance, '$.sourceId') IN $sources
        MATCH (e2)
        WHERE e2.provenance IS NOT NULL
          AND json_extract(e2.provenance, '$.sourceId') IN $sources
          AND e1.id < e2.id
          AND e1.type = e2.type
        WITH e1, e2,
             e1.properties as props1,
             e2.properties as props2
        // Simplified similarity check
        WHERE props1 = props2 OR e1.namespace = e2.namespace
        RETURN e1.id as id1, e2.id as id2
        `,
        { sources },
      );

      // Group matched entities
      const clusters = new Map<string, Set<string>>();
      const entityToCluster = new Map<string, string>();

      for (const record of result.records) {
        const id1 = record.get('id1');
        const id2 = record.get('id2');

        const cluster1 = entityToCluster.get(id1);
        const cluster2 = entityToCluster.get(id2);

        if (!cluster1 && !cluster2) {
          const newClusterId = uuidv4();
          clusters.set(newClusterId, new Set([id1, id2]));
          entityToCluster.set(id1, newClusterId);
          entityToCluster.set(id2, newClusterId);
        } else if (cluster1 && !cluster2) {
          clusters.get(cluster1)!.add(id2);
          entityToCluster.set(id2, cluster1);
        } else if (!cluster1 && cluster2) {
          clusters.get(cluster2)!.add(id1);
          entityToCluster.set(id1, cluster2);
        } else if (cluster1 !== cluster2) {
          // Merge clusters
          const cluster2Entities = clusters.get(cluster2!)!;
          clusters.get(cluster1!)!.forEach((e) => cluster2Entities.add(e));
          for (const entity of cluster2Entities) {
            entityToCluster.set(entity, cluster1!);
          }
          clusters.delete(cluster2!);
        }
      }

      // Return clusters
      return Array.from(clusters.entries()).map(([canonicalId, entities]) => ({
        canonicalId,
        matchedEntities: Array.from(entities),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Fuse multiple entities into a single canonical entity
   */
  async fuseEntities(
    entityIds: string[],
    strategy: ConflictResolutionStrategy = { type: 'highest_confidence' },
  ): Promise<FusionResult> {
    const session = this.driver.session();
    try {
      // Get all entities
      const result = await session.run(
        `
        MATCH (e)
        WHERE e.id IN $entityIds
        RETURN e
        `,
        { entityIds },
      );

      const entities = result.records.map((record) => {
        const props = record.get('e').properties;
        return {
          id: props.id,
          properties: JSON.parse(props.properties || '{}'),
          confidence: props.confidence || 0.5,
          provenance: JSON.parse(props.provenance || '{}'),
        };
      });

      // Merge properties
      const mergedProperties: Record<string, any> = {};
      const sources = new Set<string>();
      let conflictsResolved = 0;

      // Collect all property keys
      const allKeys = new Set<string>();
      entities.forEach((e) => {
        Object.keys(e.properties).forEach((key) => allKeys.add(key));
        sources.add(e.provenance.sourceId);
      });

      // Resolve conflicts for each property
      for (const key of allKeys) {
        const values = entities
          .filter((e) => key in e.properties)
          .map((e) => ({
            value: e.properties[key],
            confidence: e.confidence,
            source: e.provenance.sourceId,
          }));

        if (values.length === 1) {
          mergedProperties[key] = values[0].value;
        } else {
          // Conflict - apply resolution strategy
          conflictsResolved++;
          mergedProperties[key] = this.resolveConflict(values, strategy);
        }
      }

      // Calculate overall confidence
      const avgConfidence =
        entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;

      // Create canonical entity
      const canonicalId = uuidv4();
      await session.run(
        `
        CREATE (c:CanonicalEntity {
          id: $canonicalId,
          properties: $properties,
          confidence: $confidence,
          fusedFrom: $fusedFrom,
          sources: $sources,
          createdAt: datetime()
        })
        `,
        {
          canonicalId,
          properties: JSON.stringify(mergedProperties),
          confidence: avgConfidence,
          fusedFrom: JSON.stringify(entityIds),
          sources: JSON.stringify(Array.from(sources)),
        },
      );

      // Link original entities to canonical entity
      for (const entityId of entityIds) {
        await session.run(
          `
          MATCH (e {id: $entityId})
          MATCH (c:CanonicalEntity {id: $canonicalId})
          CREATE (e)-[:FUSED_INTO]->(c)
          `,
          { entityId, canonicalId },
        );
      }

      return {
        entityId: canonicalId,
        mergedProperties,
        conflictsResolved,
        confidenceScore: avgConfidence,
        sources: Array.from(sources),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Resolve conflicting values using specified strategy
   */
  private resolveConflict(
    values: Array<{ value: any; confidence: number; source: string }>,
    strategy: ConflictResolutionStrategy,
  ): any {
    switch (strategy.type) {
      case 'latest':
        return values[values.length - 1].value;

      case 'highest_confidence':
        return values.sort((a, b) => b.confidence - a.confidence)[0].value;

      case 'majority_vote':
        const counts = new Map<any, number>();
        values.forEach(({ value }) => {
          counts.set(value, (counts.get(value) || 0) + 1);
        });
        let maxCount = 0;
        let majorityValue = values[0].value;
        for (const [value, count] of counts.entries()) {
          if (count > maxCount) {
            maxCount = count;
            majorityValue = value;
          }
        }
        return majorityValue;

      case 'source_priority':
        if (!strategy.sourcePriority) {
          return values[0].value;
        }
        for (const source of strategy.sourcePriority) {
          const match = values.find((v) => v.source === source);
          if (match) {
            return match.value;
          }
        }
        return values[0].value;

      case 'custom':
        if (strategy.customResolver) {
          return strategy.customResolver(values.map((v) => v.value));
        }
        return values[0].value;

      default:
        return values[0].value;
    }
  }

  /**
   * Track data provenance
   */
  async trackProvenance(
    entityId: string,
    sourceId: string,
    sourceType: string,
    extractedAt: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (e {id: $entityId})
        CREATE (e)-[:HAS_PROVENANCE]->(p:Provenance {
          id: $provenanceId,
          sourceId: $sourceId,
          sourceType: $sourceType,
          extractedAt: datetime($extractedAt),
          metadata: $metadata,
          createdAt: datetime()
        })
        `,
        {
          entityId,
          provenanceId: uuidv4(),
          sourceId,
          sourceType,
          extractedAt,
          metadata: JSON.stringify(metadata || {}),
        },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get provenance information for an entity
   */
  async getProvenance(entityId: string): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e {id: $entityId})-[:HAS_PROVENANCE]->(p:Provenance)
        RETURN p
        ORDER BY p.extractedAt DESC
        `,
        { entityId },
      );

      return result.records.map((record) => {
        const props = record.get('p').properties;
        return {
          ...props,
          metadata: JSON.parse(props.metadata || '{}'),
        };
      });
    } finally {
      await session.close();
    }
  }
}
