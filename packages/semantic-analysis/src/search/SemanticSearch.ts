/**
 * Semantic Search Engine
 */

import { Driver } from 'neo4j-driver';
import { SimilarityResult, SimilarityResultSchema, Concept } from '../types/semantic.js';

export interface SearchQuery {
  text: string;
  filters?: {
    entityTypes?: string[];
    minConfidence?: number;
    namespace?: string;
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  entityId: string;
  score: number;
  snippet: string;
  highlights: string[];
  metadata: Record<string, any>;
}

export class SemanticSearch {
  constructor(private driver: Driver) {}

  /**
   * Natural language query search
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const session = this.driver.session();
    try {
      // Build the Cypher query dynamically
      const filters: string[] = [];
      const params: Record<string, any> = {
        searchText: query.text.toLowerCase(),
        limit: query.limit || 20,
        offset: query.offset || 0,
      };

      if (query.filters?.entityTypes && query.filters.entityTypes.length > 0) {
        filters.push('e.type IN $entityTypes');
        params.entityTypes = query.filters.entityTypes;
      }

      if (query.filters?.minConfidence !== undefined) {
        filters.push('e.confidence >= $minConfidence');
        params.minConfidence = query.filters.minConfidence;
      }

      if (query.filters?.namespace) {
        filters.push('e.namespace = $namespace');
        params.namespace = query.filters.namespace;
      }

      const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';

      // Simple text search (in production, use full-text indexes or vector search)
      const result = await session.run(
        `
        MATCH (e)
        ${whereClause}
        WHERE toLower(e.properties) CONTAINS $searchText
           OR toLower(toString(e.properties)) CONTAINS $searchText
        RETURN e.id as entityId,
               e.properties as properties,
               e.confidence as confidence,
               e.metadata as metadata
        ORDER BY e.confidence DESC
        SKIP $offset
        LIMIT $limit
        `,
        params,
      );

      return result.records.map((record) => ({
        entityId: record.get('entityId'),
        score: record.get('confidence'),
        snippet: JSON.stringify(record.get('properties')).substring(0, 200),
        highlights: [],
        metadata: JSON.parse(record.get('metadata') || '{}'),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Concept-based search
   */
  async searchByConcept(conceptId: string, limit = 20): Promise<SearchResult[]> {
    const session = this.driver.session();
    try {
      // Find entities related to the concept
      const result = await session.run(
        `
        MATCH (c:Concept {id: $conceptId})
        MATCH (c)-[:RELATED_TO|HAS_INSTANCE*1..2]-(e)
        WHERE NOT e:Concept
        RETURN DISTINCT e.id as entityId,
               e.properties as properties,
               e.confidence as confidence,
               e.metadata as metadata
        ORDER BY e.confidence DESC
        LIMIT $limit
        `,
        { conceptId, limit },
      );

      return result.records.map((record) => ({
        entityId: record.get('entityId'),
        score: record.get('confidence'),
        snippet: JSON.stringify(record.get('properties')).substring(0, 200),
        highlights: [],
        metadata: JSON.parse(record.get('metadata') || '{}'),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Compute semantic similarity between two entities
   */
  async computeSimilarity(
    entity1Id: string,
    entity2Id: string,
    type: 'semantic' | 'structural' | 'contextual' = 'semantic',
  ): Promise<SimilarityResult> {
    const session = this.driver.session();
    try {
      let score = 0;

      if (type === 'structural') {
        // Compute structural similarity based on graph structure
        const result = await session.run(
          `
          MATCH (e1 {id: $entity1Id})
          MATCH (e2 {id: $entity2Id})
          MATCH (e1)-[r1]-(n1)
          MATCH (e2)-[r2]-(n2)
          WITH e1, e2,
               count(DISTINCT n1) as neighbors1,
               count(DISTINCT n2) as neighbors2,
               count(DISTINCT CASE WHEN n1 = n2 THEN n1 END) as commonNeighbors
          RETURN commonNeighbors,
                 neighbors1,
                 neighbors2,
                 toFloat(commonNeighbors) / (neighbors1 + neighbors2 - commonNeighbors) as jaccardSimilarity
          `,
          { entity1Id, entity2Id },
        );

        if (result.records.length > 0) {
          score = result.records[0].get('jaccardSimilarity') || 0;
        }
      } else if (type === 'semantic') {
        // Compute semantic similarity based on shared concepts/types
        const result = await session.run(
          `
          MATCH (e1 {id: $entity1Id})
          MATCH (e2 {id: $entity2Id})
          WITH e1, e2,
               CASE WHEN e1.type = e2.type THEN 0.5 ELSE 0 END as typeSimilarity,
               CASE WHEN e1.namespace = e2.namespace THEN 0.3 ELSE 0 END as namespaceSimilarity
          RETURN typeSimilarity + namespaceSimilarity as similarity
          `,
          { entity1Id, entity2Id },
        );

        if (result.records.length > 0) {
          score = result.records[0].get('similarity') || 0;
        }
      }

      const result: SimilarityResult = {
        entity1Id,
        entity2Id,
        similarityScore: Math.min(Math.max(score, 0), 1),
        similarityType: type,
        computedAt: new Date().toISOString(),
      };

      return SimilarityResultSchema.parse(result);
    } finally {
      await session.close();
    }
  }

  /**
   * Find similar entities
   */
  async findSimilarEntities(
    entityId: string,
    limit = 10,
    minSimilarity = 0.5,
  ): Promise<Array<{ entityId: string; similarity: number }>> {
    const session = this.driver.session();
    try {
      // Find structurally similar entities
      const result = await session.run(
        `
        MATCH (e {id: $entityId})
        MATCH (e)-[r1]-(n)
        MATCH (n)-[r2]-(other)
        WHERE other.id <> $entityId
        WITH other,
             count(DISTINCT n) as commonNeighbors,
             collect(DISTINCT labels(other)) as labels
        MATCH (other)-[]-(allNeighbors)
        WITH other, commonNeighbors,
             count(DISTINCT allNeighbors) as totalNeighbors
        WITH other,
             toFloat(commonNeighbors) / totalNeighbors as similarity
        WHERE similarity >= $minSimilarity
        RETURN other.id as entityId, similarity
        ORDER BY similarity DESC
        LIMIT $limit
        `,
        { entityId, minSimilarity, limit },
      );

      return result.records.map((record) => ({
        entityId: record.get('entityId'),
        similarity: record.get('similarity'),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Perform graph traversal query
   */
  async traverseGraph(
    startEntityId: string,
    traversalPattern: string,
    maxDepth = 3,
  ): Promise<any[]> {
    const session = this.driver.session();
    try {
      // Execute custom traversal pattern
      // This is a simplified version - in production, sanitize and validate patterns
      const result = await session.run(
        `
        MATCH path = (start {id: $startEntityId})${traversalPattern}*1..${maxDepth}(end)
        RETURN path, end
        LIMIT 100
        `,
        { startEntityId },
      );

      return result.records.map((record) => ({
        path: record.get('path'),
        endNode: record.get('end').properties,
      }));
    } catch (error) {
      // Handle invalid patterns
      console.error('Traversal error:', error);
      return [];
    } finally {
      await session.close();
    }
  }
}
