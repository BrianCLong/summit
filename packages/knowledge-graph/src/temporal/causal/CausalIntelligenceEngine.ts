import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

export interface CausalRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  causeType: 'DIRECT' | 'INDIRECT' | 'CONTRIBUTING' | 'CORRELATION';
  confidence: number;
  timeDelta: number; // time diff in ms
  evidence?: string[];
  properties: Record<string, any>;
}

export interface IntelligenceScore {
  relevance: number; // 0-1
  confidence: number; // 0-1
  recency: number; // 0-1
  compositeScore: number; // 0-1
}

export class CausalIntelligenceEngine {
  constructor(private driver: Driver) {}

  /**
   * Builds a causal relationship between two temporal entities.
   */
  async buildCausalRelationship(
    sourceId: string,
    targetId: string,
    causeType: CausalRelationship['causeType'],
    confidence: number,
    timeDelta: number,
    properties: Record<string, any> = {},
    evidence: string[] = []
  ): Promise<CausalRelationship> {
    const session = this.driver.session();
    try {
      const relId = uuidv4();
      await session.run(
        `
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        CREATE (source)-[r:CAUSES {
          id: $relId,
          causeType: $causeType,
          confidence: $confidence,
          timeDelta: $timeDelta,
          evidence: $evidence,
          properties: $properties,
          createdAt: datetime()
        }]->(target)
        `,
        {
          sourceId,
          targetId,
          relId,
          causeType,
          confidence,
          timeDelta,
          evidence,
          properties: JSON.stringify(properties),
        }
      );

      return {
        id: relId,
        sourceId,
        targetId,
        causeType,
        confidence,
        timeDelta,
        evidence,
        properties
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Traversal API: What caused X at time T?
   */
  async getCauses(
    entityId: string,
    timestamp: string,
    maxDepth: number = 3
  ): Promise<CausalRelationship[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH path = (cause)-[r:CAUSES*1..${maxDepth}]->(target {id: $entityId})
        WHERE all(rel in relationships(path) WHERE rel.createdAt <= datetime($timestamp))
        RETURN relationships(path) as rels
        `,
        { entityId, timestamp }
      );

      const relationships: CausalRelationship[] = [];
      const seenIds = new Set<string>();

      for (const record of result.records) {
        const rels = record.get('rels');
        for (const rel of rels) {
          const props = rel.properties;
          if (!seenIds.has(props.id)) {
            seenIds.add(props.id);
            relationships.push({
              id: props.id,
              sourceId: rel.start.properties?.id || '', // Not ideal, but gets us close
              targetId: rel.end.properties?.id || '',
              causeType: props.causeType,
              confidence: props.confidence,
              timeDelta: props.timeDelta?.toNumber() || 0,
              evidence: props.evidence || [],
              properties: props.properties ? JSON.parse(props.properties) : {}
            });
          }
        }
      }

      return relationships;
    } finally {
      await session.close();
    }
  }

  /**
   * Intelligence scoring for nodes/edges
   */
  calculateIntelligenceScore(
    nodeCreatedAt: string,
    queryTime: string,
    confidence: number,
    baseRelevance: number
  ): IntelligenceScore {
    const createdTime = new Date(nodeCreatedAt).getTime();
    const qTime = new Date(queryTime).getTime();

    // Simple recency decay
    const ageMs = Math.max(0, qTime - createdTime);
    const halfLifeMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    const recency = Math.exp((-Math.LN2 * ageMs) / halfLifeMs);

    const compositeScore = (baseRelevance * 0.4) + (confidence * 0.4) + (recency * 0.2);

    return {
      relevance: baseRelevance,
      confidence,
      recency,
      compositeScore
    };
  }
}
