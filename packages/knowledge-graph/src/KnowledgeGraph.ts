/**
 * Main Knowledge Graph class that orchestrates all components
 */

import { GraphDatabase } from './database/GraphDatabase.js';
import { TripleStore } from './storage/TripleStore.js';
import { VersionManager } from './versioning/VersionManager.js';
import {
  GraphNode,
  GraphEdge,
  GraphQuery,
  QueryResult,
  GraphStatistics,
  GraphDatabaseConfig,
  TripleStoreConfig,
  Triple,
  TemporalQuery,
  GraphChange
} from './types.js';
import { Logger } from './utils/Logger.js';

export interface KnowledgeGraphConfig {
  database: GraphDatabaseConfig;
  tripleStore?: TripleStoreConfig;
  enableVersioning?: boolean;
  snapshotInterval?: number;
}

export class KnowledgeGraph {
  private database: GraphDatabase;
  private tripleStore?: TripleStore;
  private versionManager?: VersionManager;
  private logger: Logger;
  private config: KnowledgeGraphConfig;

  constructor(config: KnowledgeGraphConfig) {
    this.config = config;
    this.logger = new Logger('KnowledgeGraph');
    this.database = new GraphDatabase(config.database);

    if (config.tripleStore) {
      this.tripleStore = new TripleStore(config.tripleStore);
    }

    if (config.enableVersioning !== false) {
      this.versionManager = new VersionManager(config.snapshotInterval);
    }
  }

  /**
   * Initialize the knowledge graph
   */
  async initialize(): Promise<void> {
    await this.database.connect();
    this.logger.info('Knowledge graph initialized');
  }

  /**
   * Shutdown the knowledge graph
   */
  async shutdown(): Promise<void> {
    await this.database.disconnect();
    this.logger.info('Knowledge graph shutdown');
  }

  /**
   * Add an entity to the knowledge graph
   */
  async addEntity(node: GraphNode): Promise<string> {
    const id = await this.database.addNode(node);

    // Record change for versioning
    if (this.versionManager) {
      this.versionManager.recordChange({
        type: 'node_added',
        target: node.id,
        after: node,
        timestamp: new Date()
      });
    }

    // Add to triple store if available
    if (this.tripleStore) {
      const triples = this.nodeToTriples(node);
      this.tripleStore.addTriples(triples);
    }

    this.logger.info(`Added entity: ${node.id}`);
    return id;
  }

  /**
   * Add a relationship between entities
   */
  async addRelationship(edge: GraphEdge): Promise<string> {
    const id = await this.database.addEdge(edge);

    // Record change for versioning
    if (this.versionManager) {
      this.versionManager.recordChange({
        type: 'edge_added',
        target: `${edge.from}->${edge.to}`,
        after: edge,
        timestamp: new Date()
      });
    }

    // Add to triple store if available
    if (this.tripleStore) {
      this.tripleStore.addTriple({
        subject: edge.from,
        predicate: edge.type,
        object: edge.to
      });

      // Add properties as additional triples
      if (edge.properties) {
        Object.entries(edge.properties).forEach(([key, value]) => {
          this.tripleStore!.addTriple({
            subject: `${edge.from}->${edge.to}`,
            predicate: key,
            object: value
          });
        });
      }
    }

    this.logger.info(`Added relationship: ${edge.from} -[${edge.type}]-> ${edge.to}`);
    return id;
  }

  /**
   * Get an entity by ID
   */
  async getEntity(id: string): Promise<GraphNode | null> {
    return this.database.getNode(id);
  }

  /**
   * Update an entity
   */
  async updateEntity(id: string, properties: Record<string, any>): Promise<void> {
    const before = await this.database.getNode(id);
    await this.database.updateNode(id, properties);

    // Record change for versioning
    if (this.versionManager && before) {
      this.versionManager.recordChange({
        type: 'node_updated',
        target: id,
        before: before,
        after: { ...before, properties: { ...before.properties, ...properties } },
        timestamp: new Date()
      });
    }

    this.logger.info(`Updated entity: ${id}`);
  }

  /**
   * Delete an entity
   */
  async deleteEntity(id: string): Promise<void> {
    const before = await this.database.getNode(id);
    await this.database.deleteNode(id);

    // Record change for versioning
    if (this.versionManager && before) {
      this.versionManager.recordChange({
        type: 'node_deleted',
        target: id,
        before: before,
        timestamp: new Date()
      });
    }

    this.logger.info(`Deleted entity: ${id}`);
  }

  /**
   * Execute a query
   */
  async query(query: GraphQuery | string): Promise<QueryResult> {
    if (typeof query === 'string') {
      return this.database.query(query);
    } else {
      return this.database.executeQuery(query);
    }
  }

  /**
   * Execute a SPARQL query on the triple store
   */
  async sparqlQuery(query: string): Promise<any[]> {
    if (!this.tripleStore) {
      throw new Error('Triple store not enabled');
    }
    return this.tripleStore.sparqlQuery(query);
  }

  /**
   * Get graph statistics
   */
  async getStatistics(): Promise<GraphStatistics> {
    const dbStats = await this.database.getStatistics();

    return {
      nodeCount: dbStats.nodeCount,
      edgeCount: dbStats.edgeCount,
      nodeTypes: dbStats.nodeTypes,
      edgeTypes: dbStats.edgeTypes,
      avgDegree: dbStats.edgeCount / Math.max(dbStats.nodeCount, 1),
      density: (2 * dbStats.edgeCount) / (dbStats.nodeCount * (dbStats.nodeCount - 1) || 1)
    };
  }

  /**
   * Get the state of the graph at a specific time
   */
  async getVersionAt(timestamp: Date): Promise<number | undefined> {
    if (!this.versionManager) {
      throw new Error('Versioning not enabled');
    }

    const version = this.versionManager.getVersionAtTime(timestamp);
    return version?.version;
  }

  /**
   * Get changes in a time range
   */
  getChangesInTimeRange(startTime: Date, endTime: Date): GraphChange[] {
    if (!this.versionManager) {
      throw new Error('Versioning not enabled');
    }

    return this.versionManager.getChangesInTimeRange(startTime, endTime);
  }

  /**
   * Create a new version snapshot
   */
  createVersion(message: string, author?: string): number {
    if (!this.versionManager) {
      throw new Error('Versioning not enabled');
    }

    return this.versionManager.createVersion(message, author);
  }

  /**
   * Create an index for faster queries
   */
  async createIndex(label: string, properties: string[]): Promise<void> {
    await this.database.createIndex(label, properties);
  }

  /**
   * Convert a graph node to RDF triples
   */
  private nodeToTriples(node: GraphNode): Triple[] {
    const triples: Triple[] = [];

    // Add type triple
    triples.push({
      subject: node.id,
      predicate: 'rdf:type',
      object: node.type
    });

    // Add property triples
    Object.entries(node.properties).forEach(([key, value]) => {
      triples.push({
        subject: node.id,
        predicate: key,
        object: value
      });
    });

    // Add label triples
    if (node.labels) {
      node.labels.forEach(label => {
        triples.push({
          subject: node.id,
          predicate: 'rdfs:label',
          object: label
        });
      });
    }

    return triples;
  }

  /**
   * Find entities by type
   */
  async findEntitiesByType(type: string, limit?: number): Promise<GraphNode[]> {
    const query: GraphQuery = {
      match: `(n:${type})`,
      return: ['n'],
      limit
    };

    const result = await this.database.executeQuery(query);
    return result.data.map((r: any) => r.n);
  }

  /**
   * Find relationships between two entities
   */
  async findRelationshipsBetween(fromId: string, toId: string): Promise<GraphEdge[]> {
    const query = `
      MATCH (from)-[r]->(to)
      WHERE from.nodeId = $fromId AND to.nodeId = $toId
      RETURN r, type(r) as relType
    `;

    const result = await this.database.query(query, { fromId, toId });

    return result.data.map((r: any) => ({
      from: fromId,
      to: toId,
      type: r.relType,
      properties: r.r.properties,
      id: r.r.id
    }));
  }

  /**
   * Get neighbors of a node
   */
  async getNeighbors(nodeId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<GraphNode[]> {
    let pattern: string;

    if (direction === 'out') {
      pattern = '(n)-[]->(neighbor)';
    } else if (direction === 'in') {
      pattern = '(n)<-[]-(neighbor)';
    } else {
      pattern = '(n)-[]-(neighbor)';
    }

    const query = `
      MATCH ${pattern}
      WHERE n.nodeId = $nodeId
      RETURN DISTINCT neighbor
    `;

    const result = await this.database.query(query, { nodeId });
    return result.data.map((r: any) => r.neighbor);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.database.healthCheck();
  }

  /**
   * Get version manager (for advanced usage)
   */
  getVersionManager(): VersionManager | undefined {
    return this.versionManager;
  }

  /**
   * Get triple store (for advanced usage)
   */
  getTripleStore(): TripleStore | undefined {
    return this.tripleStore;
  }

  /**
   * Get database (for advanced usage)
   */
  getDatabase(): GraphDatabase {
    return this.database;
  }
}
