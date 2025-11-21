/**
 * Graph indexing infrastructure for high-performance queries
 */

import { Logger } from '../utils/Logger.js';

export interface IndexDefinition {
  name: string;
  type: 'btree' | 'fulltext' | 'spatial' | 'composite' | 'vector';
  labels: string[];
  properties: string[];
  options?: {
    analyzer?: string;
    dimensions?: number;
    similarity?: 'cosine' | 'euclidean';
  };
}

export interface IndexStats {
  name: string;
  type: string;
  populationPercent: number;
  size: number;
  entityCount: number;
  state: 'ONLINE' | 'POPULATING' | 'FAILED';
}

export class GraphIndexer {
  private logger: Logger;
  private indexes: Map<string, IndexDefinition>;

  constructor() {
    this.logger = new Logger('GraphIndexer');
    this.indexes = new Map();
  }

  /**
   * Create a B-tree index for fast equality lookups
   */
  async createBTreeIndex(label: string, properties: string[]): Promise<string> {
    const indexName = `idx_${label}_${properties.join('_')}`;

    this.indexes.set(indexName, {
      name: indexName,
      type: 'btree',
      labels: [label],
      properties
    });

    this.logger.info(`Created B-tree index: ${indexName}`);
    return indexName;
  }

  /**
   * Create a full-text search index
   */
  async createFullTextIndex(
    name: string,
    labels: string[],
    properties: string[],
    analyzer: string = 'standard'
  ): Promise<string> {
    const indexName = `fts_${name}`;

    this.indexes.set(indexName, {
      name: indexName,
      type: 'fulltext',
      labels,
      properties,
      options: { analyzer }
    });

    this.logger.info(`Created full-text index: ${indexName}`);
    return indexName;
  }

  /**
   * Create a spatial index for geo queries
   */
  async createSpatialIndex(label: string, property: string): Promise<string> {
    const indexName = `spatial_${label}_${property}`;

    this.indexes.set(indexName, {
      name: indexName,
      type: 'spatial',
      labels: [label],
      properties: [property]
    });

    this.logger.info(`Created spatial index: ${indexName}`);
    return indexName;
  }

  /**
   * Create a vector index for similarity search
   */
  async createVectorIndex(
    label: string,
    property: string,
    dimensions: number,
    similarity: 'cosine' | 'euclidean' = 'cosine'
  ): Promise<string> {
    const indexName = `vector_${label}_${property}`;

    this.indexes.set(indexName, {
      name: indexName,
      type: 'vector',
      labels: [label],
      properties: [property],
      options: { dimensions, similarity }
    });

    this.logger.info(`Created vector index: ${indexName}`);
    return indexName;
  }

  /**
   * Create a composite index on multiple properties
   */
  async createCompositeIndex(label: string, properties: string[]): Promise<string> {
    const indexName = `composite_${label}_${properties.join('_')}`;

    this.indexes.set(indexName, {
      name: indexName,
      type: 'composite',
      labels: [label],
      properties
    });

    this.logger.info(`Created composite index: ${indexName}`);
    return indexName;
  }

  /**
   * Drop an index
   */
  async dropIndex(indexName: string): Promise<void> {
    this.indexes.delete(indexName);
    this.logger.info(`Dropped index: ${indexName}`);
  }

  /**
   * Get all indexes
   */
  getIndexes(): IndexDefinition[] {
    return Array.from(this.indexes.values());
  }

  /**
   * Get index by name
   */
  getIndex(name: string): IndexDefinition | undefined {
    return this.indexes.get(name);
  }

  /**
   * Check if an index exists
   */
  hasIndex(name: string): boolean {
    return this.indexes.has(name);
  }

  /**
   * Get indexes for a label
   */
  getIndexesForLabel(label: string): IndexDefinition[] {
    return Array.from(this.indexes.values())
      .filter(idx => idx.labels.includes(label));
  }

  /**
   * Get recommended indexes based on query patterns
   */
  recommendIndexes(queryPatterns: string[]): IndexDefinition[] {
    const recommendations: IndexDefinition[] = [];

    // Analyze query patterns and suggest indexes
    for (const pattern of queryPatterns) {
      // Simple pattern analysis - would be more sophisticated in production
      const labelMatch = pattern.match(/\((\w+):(\w+)\)/);
      const propMatch = pattern.match(/WHERE\s+\w+\.(\w+)/);

      if (labelMatch && propMatch) {
        const label = labelMatch[2];
        const property = propMatch[1];

        recommendations.push({
          name: `idx_${label}_${property}`,
          type: 'btree',
          labels: [label],
          properties: [property]
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate Cypher for creating indexes
   */
  generateIndexCypher(index: IndexDefinition): string {
    switch (index.type) {
      case 'btree':
        return `CREATE INDEX ${index.name} IF NOT EXISTS FOR (n:${index.labels[0]}) ON (${index.properties.map(p => `n.${p}`).join(', ')})`;

      case 'fulltext':
        return `CREATE FULLTEXT INDEX ${index.name} IF NOT EXISTS FOR (n:${index.labels.join('|')}) ON EACH [${index.properties.map(p => `n.${p}`).join(', ')}]`;

      case 'spatial':
        return `CREATE POINT INDEX ${index.name} IF NOT EXISTS FOR (n:${index.labels[0]}) ON (n.${index.properties[0]})`;

      case 'vector':
        return `CREATE VECTOR INDEX ${index.name} IF NOT EXISTS FOR (n:${index.labels[0]}) ON (n.${index.properties[0]}) OPTIONS {indexConfig: {vector.dimensions: ${index.options?.dimensions}, vector.similarity_function: '${index.options?.similarity}'}}`;

      default:
        return `CREATE INDEX ${index.name} IF NOT EXISTS FOR (n:${index.labels[0]}) ON (${index.properties.map(p => `n.${p}`).join(', ')})`;
    }
  }
}
