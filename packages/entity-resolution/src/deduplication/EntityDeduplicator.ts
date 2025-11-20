/**
 * Entity deduplication and clustering
 */

import {
  Entity,
  EntityCluster,
  EntityMatch,
  DeduplicationConfig,
  ClusteringMethod,
  RecommendationAction,
  ResolutionResult
} from '../types.js';
import { EntityMatcher } from '../matching/EntityMatcher.js';
import { v4 as uuidv4 } from 'uuid';

export class EntityDeduplicator {
  private config: DeduplicationConfig;
  private matcher: EntityMatcher;

  constructor(config: DeduplicationConfig, matcher: EntityMatcher) {
    this.config = {
      autoMergeThreshold: 0.95,
      reviewThreshold: 0.75,
      clusteringMethod: ClusteringMethod.CONNECTED_COMPONENTS,
      preserveProvenance: true,
      ...config
    };
    this.matcher = matcher;
  }

  /**
   * Deduplicate a list of entities
   */
  async deduplicate(entities: Entity[]): Promise<ResolutionResult[]> {
    const results: ResolutionResult[] = [];

    // Build match graph
    const matches = await this.findAllMatches(entities);

    // Cluster entities
    const clusters = this.clusterEntities(entities, matches);

    // Generate resolution results
    for (const entity of entities) {
      const entityMatches = matches.filter(
        m => m.entity1.id === entity.id || m.entity2.id === entity.id
      );

      const cluster = clusters.find(c =>
        c.members.some(m => m.id === entity.id)
      );

      const recommendations = this.generateRecommendations(entity, entityMatches);

      results.push({
        entity,
        matches: entityMatches,
        cluster,
        recommendations
      });
    }

    return results;
  }

  /**
   * Find all matches between entities
   */
  private async findAllMatches(entities: Entity[]): Promise<EntityMatch[]> {
    const matches: EntityMatch[] = [];

    // Use blocking to reduce comparisons
    const blocks = this.createBlocks(entities);

    for (const [blockKey, blockEntities] of blocks.entries()) {
      // Only compare within same block
      for (let i = 0; i < blockEntities.length; i++) {
        const matchResults = await this.matcher.findMatches(
          blockEntities[i],
          blockEntities.slice(i + 1)
        );
        matches.push(...matchResults);
      }
    }

    return matches;
  }

  /**
   * Create blocks for efficient matching (blocking strategy)
   */
  private createBlocks(entities: Entity[]): Map<string, Entity[]> {
    const blocks = new Map<string, Entity[]>();

    for (const entity of entities) {
      // Create block key based on entity type and first few characters
      const blockKey = this.getBlockKey(entity);

      if (!blocks.has(blockKey)) {
        blocks.set(blockKey, []);
      }

      blocks.get(blockKey)!.push(entity);
    }

    return blocks;
  }

  /**
   * Get block key for an entity
   */
  private getBlockKey(entity: Entity): string {
    const normalized = entity.text.toLowerCase().replace(/[^\w]/g, '');
    const prefix = normalized.substring(0, 3);
    return `${entity.type}:${prefix}`;
  }

  /**
   * Cluster entities based on matches
   */
  private clusterEntities(entities: Entity[], matches: EntityMatch[]): EntityCluster[] {
    switch (this.config.clusteringMethod) {
      case ClusteringMethod.CONNECTED_COMPONENTS:
        return this.connectedComponentsClustering(entities, matches);

      case ClusteringMethod.HIERARCHICAL:
        return this.hierarchicalClustering(entities, matches);

      default:
        return this.connectedComponentsClustering(entities, matches);
    }
  }

  /**
   * Connected components clustering
   */
  private connectedComponentsClustering(entities: Entity[], matches: EntityMatch[]): EntityCluster[] {
    // Build adjacency list
    const graph = new Map<string, Set<string>>();

    for (const entity of entities) {
      graph.set(entity.id, new Set());
    }

    for (const match of matches) {
      if (match.score >= this.config.autoMergeThreshold) {
        graph.get(match.entity1.id)!.add(match.entity2.id);
        graph.get(match.entity2.id)!.add(match.entity1.id);
      }
    }

    // Find connected components using BFS
    const visited = new Set<string>();
    const clusters: EntityCluster[] = [];

    for (const entity of entities) {
      if (visited.has(entity.id)) {
        continue;
      }

      const component = this.bfs(entity.id, graph, visited);
      const members = entities.filter(e => component.has(e.id));

      if (members.length > 1) {
        const canonical = this.selectCanonicalEntity(members);
        const avgConfidence = members.reduce((sum, m) => sum + m.confidence, 0) / members.length;

        clusters.push({
          id: uuidv4(),
          canonicalEntity: canonical,
          members,
          confidence: avgConfidence,
          method: ClusteringMethod.CONNECTED_COMPONENTS
        });
      }
    }

    return clusters;
  }

  /**
   * Breadth-first search to find connected component
   */
  private bfs(startId: string, graph: Map<string, Set<string>>, visited: Set<string>): Set<string> {
    const component = new Set<string>();
    const queue = [startId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);
      component.add(current);

      const neighbors = graph.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return component;
  }

  /**
   * Hierarchical clustering (simplified)
   */
  private hierarchicalClustering(entities: Entity[], matches: EntityMatch[]): EntityCluster[] {
    // Start with each entity in its own cluster
    const clusters: EntityCluster[] = entities.map(e => ({
      id: uuidv4(),
      canonicalEntity: e,
      members: [e],
      confidence: e.confidence,
      method: ClusteringMethod.HIERARCHICAL
    }));

    // Iteratively merge closest clusters
    const sortedMatches = [...matches].sort((a, b) => b.score - a.score);

    for (const match of sortedMatches) {
      if (match.score < this.config.autoMergeThreshold) {
        break;
      }

      const cluster1 = clusters.find(c => c.members.some(m => m.id === match.entity1.id));
      const cluster2 = clusters.find(c => c.members.some(m => m.id === match.entity2.id));

      if (cluster1 && cluster2 && cluster1 !== cluster2) {
        // Merge clusters
        const mergedMembers = [...cluster1.members, ...cluster2.members];
        const mergedCluster: EntityCluster = {
          id: uuidv4(),
          canonicalEntity: this.selectCanonicalEntity(mergedMembers),
          members: mergedMembers,
          confidence: (cluster1.confidence + cluster2.confidence) / 2,
          method: ClusteringMethod.HIERARCHICAL
        };

        // Remove old clusters and add merged one
        const idx1 = clusters.indexOf(cluster1);
        const idx2 = clusters.indexOf(cluster2);
        clusters.splice(Math.max(idx1, idx2), 1);
        clusters.splice(Math.min(idx1, idx2), 1);
        clusters.push(mergedCluster);
      }
    }

    // Return only clusters with multiple members
    return clusters.filter(c => c.members.length > 1);
  }

  /**
   * Select the canonical (representative) entity from a group
   */
  private selectCanonicalEntity(entities: Entity[]): Entity {
    // Prefer entities with:
    // 1. Highest confidence
    // 2. Most attributes
    // 3. Earliest extraction time

    return entities.reduce((best, current) => {
      if (current.confidence > best.confidence) {
        return current;
      }

      if (current.confidence === best.confidence) {
        const currentAttrCount = Object.keys(current.attributes).length;
        const bestAttrCount = Object.keys(best.attributes).length;

        if (currentAttrCount > bestAttrCount) {
          return current;
        }

        if (currentAttrCount === bestAttrCount && current.metadata?.extractedAt && best.metadata?.extractedAt) {
          if (current.metadata.extractedAt < best.metadata.extractedAt) {
            return current;
          }
        }
      }

      return best;
    });
  }

  /**
   * Generate recommendations for entity resolution
   */
  private generateRecommendations(entity: Entity, matches: EntityMatch[]): RecommendationAction[] {
    const recommendations: RecommendationAction[] = [];

    for (const match of matches) {
      if (match.score >= this.config.autoMergeThreshold) {
        recommendations.push(RecommendationAction.AUTO_MERGE);
      } else if (match.score >= this.config.reviewThreshold) {
        recommendations.push(RecommendationAction.REVIEW_MERGE);
      } else if (match.score >= 0.5) {
        recommendations.push(RecommendationAction.NEEDS_DISAMBIGUATION);
      } else {
        recommendations.push(RecommendationAction.KEEP_SEPARATE);
      }
    }

    // If no matches, keep separate
    if (recommendations.length === 0) {
      recommendations.push(RecommendationAction.KEEP_SEPARATE);
    }

    return recommendations;
  }

  /**
   * Merge entities into a single canonical entity
   */
  mergeEntities(entities: Entity[]): Entity {
    if (entities.length === 0) {
      throw new Error('Cannot merge empty entity list');
    }

    if (entities.length === 1) {
      return entities[0];
    }

    const canonical = this.selectCanonicalEntity(entities);

    // Merge attributes
    const mergedAttributes: Record<string, any> = { ...canonical.attributes };

    for (const entity of entities) {
      for (const [key, value] of Object.entries(entity.attributes)) {
        if (!(key in mergedAttributes)) {
          mergedAttributes[key] = value;
        }
      }
    }

    // Track provenance if enabled
    const sources = this.config.preserveProvenance
      ? entities.map(e => e.source).filter(Boolean)
      : [];

    return {
      ...canonical,
      attributes: mergedAttributes,
      confidence: entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length,
      metadata: {
        ...canonical.metadata,
        source: sources.length > 0 ? sources.join(', ') : canonical.source
      }
    };
  }

  /**
   * Get deduplication statistics
   */
  getStatistics(results: ResolutionResult[]): {
    totalEntities: number;
    duplicateClusters: number;
    autoMergeCount: number;
    reviewCount: number;
    uniqueEntities: number;
  } {
    const clusters = results.map(r => r.cluster).filter(Boolean) as EntityCluster[];
    const uniqueClusters = new Set(clusters.map(c => c.id));

    const autoMergeCount = results.filter(r =>
      r.recommendations.includes(RecommendationAction.AUTO_MERGE)
    ).length;

    const reviewCount = results.filter(r =>
      r.recommendations.includes(RecommendationAction.REVIEW_MERGE)
    ).length;

    return {
      totalEntities: results.length,
      duplicateClusters: uniqueClusters.size,
      autoMergeCount,
      reviewCount,
      uniqueEntities: results.length - autoMergeCount
    };
  }
}
