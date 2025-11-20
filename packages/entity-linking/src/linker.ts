/**
 * Entity linking engine
 */

import type {
  EntityLink,
  LinkType,
  Evidence,
  LinkingConfig,
  LinkingResult,
  EntityCluster,
  EvidenceType
} from './types.js';

export class EntityLinker {
  private config: LinkingConfig;
  private links: Map<string, EntityLink[]>;
  private entities: Set<string>;

  constructor(config: LinkingConfig) {
    this.config = config;
    this.links = new Map();
    this.entities = new Set();
  }

  /**
   * Add an entity to the linking system
   */
  addEntity(entityId: string): void {
    this.entities.add(entityId);
  }

  /**
   * Create a link between two entities
   */
  addLink(
    sourceEntity: string,
    targetEntity: string,
    linkType: LinkType,
    evidence: Evidence[]
  ): EntityLink {
    const confidence = this.calculateLinkConfidence(evidence);

    if (confidence < this.config.minConfidence) {
      throw new Error(
        `Link confidence ${confidence} below minimum ${this.config.minConfidence}`
      );
    }

    const link: EntityLink = {
      sourceEntity,
      targetEntity,
      linkType,
      confidence,
      evidence,
      createdAt: new Date(),
      metadata: {}
    };

    // Add to source entity links
    const sourceLinks = this.links.get(sourceEntity) || [];
    sourceLinks.push(link);
    this.links.set(sourceEntity, sourceLinks);

    // Add entities
    this.addEntity(sourceEntity);
    this.addEntity(targetEntity);

    return link;
  }

  /**
   * Calculate link confidence from evidence
   */
  private calculateLinkConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const e of evidence) {
      const weight = this.config.evidenceWeights[e.type] || 1.0;
      weightedSum += e.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Find all links for an entity
   */
  getLinks(entityId: string): EntityLink[] {
    return this.links.get(entityId) || [];
  }

  /**
   * Find entities linked to a given entity
   */
  getLinkedEntities(entityId: string, linkType?: LinkType): string[] {
    const links = this.getLinks(entityId);

    return links
      .filter(link => !linkType || link.linkType === linkType)
      .map(link => link.targetEntity);
  }

  /**
   * Find shortest path between two entities
   */
  findPath(
    sourceEntity: string,
    targetEntity: string,
    maxDepth: number = 5
  ): string[] | null {
    if (sourceEntity === targetEntity) return [sourceEntity];

    const visited = new Set<string>();
    const queue: { entity: string; path: string[] }[] = [
      { entity: sourceEntity, path: [sourceEntity] }
    ];

    while (queue.length > 0) {
      const { entity, path } = queue.shift()!;

      if (path.length > maxDepth) continue;

      if (entity === targetEntity) return path;

      if (visited.has(entity)) continue;
      visited.add(entity);

      const links = this.getLinks(entity);

      for (const link of links) {
        if (!visited.has(link.targetEntity)) {
          queue.push({
            entity: link.targetEntity,
            path: [...path, link.targetEntity]
          });
        }
      }
    }

    return null;
  }

  /**
   * Discover links between entities based on shared attributes
   */
  async discoverLinks(
    entities: Map<string, Record<string, any>>,
    linkType: LinkType = 'related_to'
  ): Promise<EntityLink[]> {
    const discovered: EntityLink[] = [];

    const entityArray = Array.from(entities.entries());

    for (let i = 0; i < entityArray.length; i++) {
      const [entity1Id, entity1Attrs] = entityArray[i];

      for (let j = i + 1; j < entityArray.length; j++) {
        const [entity2Id, entity2Attrs] = entityArray[j];

        const evidence = this.findSharedAttributes(entity1Attrs, entity2Attrs);

        if (evidence.length > 0) {
          const confidence = this.calculateLinkConfidence(evidence);

          if (confidence >= this.config.minConfidence) {
            const link: EntityLink = {
              sourceEntity: entity1Id,
              targetEntity: entity2Id,
              linkType,
              confidence,
              evidence,
              createdAt: new Date(),
              metadata: {}
            };

            discovered.push(link);
            this.addLink(entity1Id, entity2Id, linkType, evidence);
          }
        }
      }
    }

    return discovered;
  }

  /**
   * Find shared attributes between two entities
   */
  private findSharedAttributes(
    attrs1: Record<string, any>,
    attrs2: Record<string, any>
  ): Evidence[] {
    const evidence: Evidence[] = [];

    for (const [key, value1] of Object.entries(attrs1)) {
      const value2 = attrs2[key];

      if (value2 && this.valuesMatch(value1, value2)) {
        evidence.push({
          source: 'attribute_comparison',
          type: 'shared_attribute',
          value: { field: key, value: value1 },
          confidence: 0.8,
          timestamp: new Date()
        });
      }
    }

    return evidence;
  }

  /**
   * Check if two values match
   */
  private valuesMatch(value1: any, value2: any): boolean {
    if (value1 === value2) return true;

    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() === value2.toLowerCase();
    }

    return false;
  }

  /**
   * Build entity clusters from links
   */
  buildClusters(): EntityCluster[] {
    const visited = new Set<string>();
    const clusters: EntityCluster[] = [];

    for (const entity of this.entities) {
      if (visited.has(entity)) continue;

      const cluster = this.expandCluster(entity, visited);

      if (cluster.entities.length > 1) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Expand cluster from seed entity using BFS
   */
  private expandCluster(
    seedEntity: string,
    visited: Set<string>
  ): EntityCluster {
    const entities: string[] = [];
    const queue: string[] = [seedEntity];
    let totalConfidence = 0;
    let linkCount = 0;

    while (queue.length > 0) {
      const entity = queue.shift()!;

      if (visited.has(entity)) continue;
      visited.add(entity);
      entities.push(entity);

      const links = this.getLinks(entity);

      for (const link of links) {
        if (!visited.has(link.targetEntity)) {
          queue.push(link.targetEntity);
          totalConfidence += link.confidence;
          linkCount++;
        }
      }
    }

    return {
      clusterId: `cluster_${seedEntity}`,
      entities,
      linkType: 'same_as',
      confidence: linkCount > 0 ? totalConfidence / linkCount : 0,
      centerEntity: seedEntity
    };
  }

  /**
   * Generate linking result with statistics
   */
  generateResult(): LinkingResult {
    const allLinks: EntityLink[] = [];
    const linkTypeDistribution: Record<string, number> = {};

    for (const links of this.links.values()) {
      allLinks.push(...links);

      for (const link of links) {
        linkTypeDistribution[link.linkType] =
          (linkTypeDistribution[link.linkType] || 0) + 1;
      }
    }

    const clusters = this.buildClusters();

    const avgConfidence =
      allLinks.length > 0
        ? allLinks.reduce((sum, link) => sum + link.confidence, 0) / allLinks.length
        : 0;

    return {
      links: allLinks,
      entities: this.entities,
      clusters,
      statistics: {
        totalEntities: this.entities.size,
        totalLinks: allLinks.length,
        totalClusters: clusters.length,
        averageConfidence: avgConfidence,
        linkTypeDistribution: linkTypeDistribution as any
      }
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.links.clear();
    this.entities.clear();
  }
}
