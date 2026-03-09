/**
 * Neo4j Graph Embeddings
 * Generates graph-aware embeddings using Neo4j's graph structure.
 * Implements Node2Vec, GraphSAGE-style neighborhood aggregation.
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import pino from 'pino';

import type {
  GraphEmbeddingNode,
  GraphEmbeddingConfig,
  NeighborInfo,
  FusedEmbedding,
  ModalityType,
} from './types.js';

const logger = pino({ name: 'neo4j-embeddings' });

export interface Neo4jEmbeddingsConfig extends GraphEmbeddingConfig {
  uri: string;
  username: string;
  password: string;
  database: string;
  maxNeighbors: number;
  aggregationMethod: 'mean' | 'max' | 'attention';
  includeRelationshipTypes: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
}

interface RandomWalk {
  nodes: string[];
  relationships: string[];
}

interface NodeFeatures {
  nodeId: string;
  labels: string[];
  properties: Record<string, unknown>;
  degree: number;
  inDegree: number;
  outDegree: number;
}

export class Neo4jEmbeddings {
  private driver: Driver | null = null;
  private config: Neo4jEmbeddingsConfig;
  private initialized = false;
  private embeddingCache: Map<string, { embedding: number[]; timestamp: number }> = new Map();

  constructor(config: Partial<Neo4jEmbeddingsConfig> = {}) {
    this.config = {
      algorithm: 'node2vec',
      dimensions: 128,
      walkLength: 80,
      numWalks: 10,
      p: 1.0,
      q: 1.0,
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password',
      database: process.env.NEO4J_DATABASE || 'neo4j',
      maxNeighbors: 50,
      aggregationMethod: 'mean',
      includeRelationshipTypes: true,
      cacheEnabled: true,
      cacheTTL: 3600000, // 1 hour
      ...config,
    };

    logger.info('Neo4j Embeddings configured', {
      algorithm: this.config.algorithm,
      dimensions: this.config.dimensions,
      uri: this.config.uri,
    });
  }

  /**
   * Initialize connection to Neo4j
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password),
      );

      // Verify connectivity
      await this.driver.verifyConnectivity();

      this.initialized = true;
      logger.info('Neo4j connection established');
    } catch (error) {
      logger.error('Failed to connect to Neo4j', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate graph embedding for a node
   */
  async embedNode(
    nodeId: string,
    investigationId: string,
  ): Promise<GraphEmbeddingNode> {
    await this.ensureInitialized();

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.getCached(nodeId);
      if (cached) {
        logger.debug('Cache hit for node embedding', { nodeId });
        return {
          nodeId,
          labels: [],
          properties: {},
          embedding: cached,
          neighbors: [],
        };
      }
    }

    const session = this.driver!.session({ database: this.config.database });

    try {
      // Get node features
      const nodeFeatures = await this.getNodeFeatures(session, nodeId);

      // Get neighbors
      const neighbors = await this.getNeighbors(session, nodeId);

      // Generate embedding based on algorithm
      let embedding: number[];

      switch (this.config.algorithm) {
        case 'node2vec':
          embedding = await this.node2vecEmbedding(session, nodeId);
          break;
        case 'graphsage':
          embedding = await this.graphSageEmbedding(session, nodeId, neighbors);
          break;
        case 'gat':
          embedding = await this.gatEmbedding(session, nodeId, neighbors);
          break;
        case 'gcn':
          embedding = await this.gcnEmbedding(session, nodeId, neighbors);
          break;
        default:
          embedding = await this.node2vecEmbedding(session, nodeId);
      }

      // Cache the embedding
      if (this.config.cacheEnabled) {
        this.cacheEmbedding(nodeId, embedding);
      }

      return {
        nodeId,
        labels: nodeFeatures.labels,
        properties: nodeFeatures.properties,
        embedding,
        neighbors,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Generate embeddings for multiple nodes
   */
  async embedNodes(
    nodeIds: string[],
    investigationId: string,
  ): Promise<GraphEmbeddingNode[]> {
    const results: GraphEmbeddingNode[] = [];

    for (const nodeId of nodeIds) {
      try {
        const embedding = await this.embedNode(nodeId, investigationId);
        results.push(embedding);
      } catch (error) {
        logger.warn('Failed to embed node', {
          nodeId,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    return results;
  }

  /**
   * Generate Node2Vec-style embedding using random walks
   */
  private async node2vecEmbedding(
    session: Session,
    nodeId: string,
  ): Promise<number[]> {
    // Generate random walks
    const walks = await this.generateRandomWalks(session, nodeId);

    // Create embedding from walks using skip-gram style approach
    const embedding = this.walksToEmbedding(walks);

    return embedding;
  }

  /**
   * Generate GraphSAGE-style embedding using neighbor aggregation
   */
  private async graphSageEmbedding(
    session: Session,
    nodeId: string,
    neighbors: NeighborInfo[],
  ): Promise<number[]> {
    // Get node's own features
    const nodeFeatures = await this.getNodeFeatureVector(session, nodeId);

    // Get neighbor feature vectors
    const neighborFeatures: number[][] = [];
    for (const neighbor of neighbors.slice(0, this.config.maxNeighbors)) {
      const features = await this.getNodeFeatureVector(session, neighbor.nodeId);
      neighborFeatures.push(features);
    }

    // Aggregate neighbor features
    const aggregatedNeighbors = this.aggregateFeatures(neighborFeatures);

    // Concatenate and project
    const combined = [...nodeFeatures, ...aggregatedNeighbors];
    const embedding = this.projectToTargetDimension(combined);

    return embedding;
  }

  /**
   * Generate GAT-style embedding with attention
   */
  private async gatEmbedding(
    session: Session,
    nodeId: string,
    neighbors: NeighborInfo[],
  ): Promise<number[]> {
    // Get node's own features
    const nodeFeatures = await this.getNodeFeatureVector(session, nodeId);

    // Get neighbor features with attention weights
    const weightedFeatures: number[][] = [];
    let totalWeight = 0;

    for (const neighbor of neighbors.slice(0, this.config.maxNeighbors)) {
      const features = await this.getNodeFeatureVector(session, neighbor.nodeId);

      // Calculate attention weight based on relationship weight and feature similarity
      const attention = this.calculateAttention(nodeFeatures, features, neighbor.weight);
      totalWeight += attention;

      const weighted = features.map((f) => f * attention);
      weightedFeatures.push(weighted);
    }

    // Normalize and aggregate
    if (totalWeight > 0) {
      for (const features of weightedFeatures) {
        for (let i = 0; i < features.length; i++) {
          features[i] /= totalWeight;
        }
      }
    }

    const aggregated = this.aggregateFeatures(weightedFeatures);
    const combined = [...nodeFeatures, ...aggregated];
    const embedding = this.projectToTargetDimension(combined);

    return embedding;
  }

  /**
   * Generate GCN-style embedding
   */
  private async gcnEmbedding(
    session: Session,
    nodeId: string,
    neighbors: NeighborInfo[],
  ): Promise<number[]> {
    // Simple GCN: aggregate self + neighbors with degree normalization
    const nodeFeatures = await this.getNodeFeatureVector(session, nodeId);
    const selfDegree = neighbors.length + 1;

    const allFeatures: number[][] = [
      nodeFeatures.map((f) => f / Math.sqrt(selfDegree)),
    ];

    for (const neighbor of neighbors.slice(0, this.config.maxNeighbors)) {
      const features = await this.getNodeFeatureVector(session, neighbor.nodeId);
      const neighborDegree = await this.getNodeDegree(session, neighbor.nodeId);

      // Symmetric normalization
      const norm = 1 / Math.sqrt(selfDegree * neighborDegree);
      allFeatures.push(features.map((f) => f * norm));
    }

    const aggregated = this.aggregateFeatures(allFeatures);
    const embedding = this.projectToTargetDimension(aggregated);

    return embedding;
  }

  /**
   * Generate random walks from a node
   */
  private async generateRandomWalks(
    session: Session,
    startNodeId: string,
  ): Promise<RandomWalk[]> {
    const walks: RandomWalk[] = [];

    for (let i = 0; i < this.config.numWalks; i++) {
      const walk = await this.randomWalk(session, startNodeId);
      walks.push(walk);
    }

    return walks;
  }

  /**
   * Perform a single random walk
   */
  private async randomWalk(
    session: Session,
    startNodeId: string,
  ): Promise<RandomWalk> {
    const nodes: string[] = [startNodeId];
    const relationships: string[] = [];

    let currentNodeId = startNodeId;
    let prevNodeId: string | null = null;

    for (let step = 0; step < this.config.walkLength; step++) {
      const neighbors = await this.getNeighborsForWalk(session, currentNodeId);

      if (neighbors.length === 0) break;

      // Node2Vec biased sampling
      const nextNode = this.sampleNextNode(
        neighbors,
        prevNodeId,
        this.config.p,
        this.config.q,
      );

      nodes.push(nextNode.nodeId);
      relationships.push(nextNode.relationship);

      prevNodeId = currentNodeId;
      currentNodeId = nextNode.nodeId;
    }

    return { nodes, relationships };
  }

  /**
   * Sample next node using Node2Vec bias
   */
  private sampleNextNode(
    neighbors: Array<{ nodeId: string; relationship: string; prevDistance: number }>,
    prevNodeId: string | null,
    p: number,
    q: number,
  ): { nodeId: string; relationship: string } {
    // Calculate unnormalized probabilities
    const probs: number[] = [];

    for (const neighbor of neighbors) {
      let prob: number;

      if (neighbor.nodeId === prevNodeId) {
        // Return to previous node
        prob = 1 / p;
      } else if (neighbor.prevDistance === 1) {
        // Distance 1 from previous (BFS-like)
        prob = 1;
      } else {
        // Distance 2 from previous (DFS-like)
        prob = 1 / q;
      }

      probs.push(prob);
    }

    // Normalize
    const sum = probs.reduce((a, b) => a + b, 0);
    const normalized = probs.map((p) => p / sum);

    // Sample
    const rand = Math.random();
    let cumulative = 0;

    for (let i = 0; i < neighbors.length; i++) {
      cumulative += normalized[i];
      if (rand <= cumulative) {
        return {
          nodeId: neighbors[i].nodeId,
          relationship: neighbors[i].relationship,
        };
      }
    }

    // Fallback to last
    return {
      nodeId: neighbors[neighbors.length - 1].nodeId,
      relationship: neighbors[neighbors.length - 1].relationship,
    };
  }

  /**
   * Convert random walks to embedding
   */
  private walksToEmbedding(walks: RandomWalk[]): number[] {
    // Simple approach: create embedding from node visit frequencies
    const nodeVisits = new Map<string, number>();
    const relVisits = new Map<string, number>();

    for (const walk of walks) {
      for (const node of walk.nodes) {
        nodeVisits.set(node, (nodeVisits.get(node) || 0) + 1);
      }
      for (const rel of walk.relationships) {
        relVisits.set(rel, (relVisits.get(rel) || 0) + 1);
      }
    }

    // Create feature vector from visit patterns
    const features: number[] = [];

    // Add statistical features
    const visitCounts = Array.from(nodeVisits.values());
    features.push(visitCounts.length); // unique nodes visited
    features.push(Math.max(...visitCounts, 0)); // max visits
    features.push(visitCounts.reduce((a, b) => a + b, 0) / visitCounts.length || 0); // avg visits

    const relCounts = Array.from(relVisits.values());
    features.push(relCounts.length); // unique relationships
    features.push(Math.max(...relCounts, 0));

    // Pad or truncate to target dimension
    return this.projectToTargetDimension(features);
  }

  /**
   * Get node features from Neo4j
   */
  private async getNodeFeatures(
    session: Session,
    nodeId: string,
  ): Promise<NodeFeatures> {
    const result = await session.run(
      `
      MATCH (n)
      WHERE n.id = $nodeId OR id(n) = toInteger($nodeId)
      OPTIONAL MATCH (n)-[r]->()
      WITH n, count(r) as outDeg
      OPTIONAL MATCH ()-[r2]->(n)
      RETURN n, labels(n) as labels, outDeg, count(r2) as inDeg
      `,
      { nodeId },
    );

    if (result.records.length === 0) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const record = result.records[0];
    const node = record.get('n');

    return {
      nodeId,
      labels: record.get('labels') || [],
      properties: node.properties,
      degree: record.get('outDeg').toNumber() + record.get('inDeg').toNumber(),
      inDegree: record.get('inDeg').toNumber(),
      outDegree: record.get('outDeg').toNumber(),
    };
  }

  /**
   * Get neighbor information
   */
  private async getNeighbors(
    session: Session,
    nodeId: string,
  ): Promise<NeighborInfo[]> {
    const result = await session.run(
      `
      MATCH (n)-[r]-(neighbor)
      WHERE n.id = $nodeId OR id(n) = toInteger($nodeId)
      RETURN DISTINCT neighbor.id as neighborId, type(r) as relType,
             coalesce(r.weight, 1.0) as weight
      LIMIT $limit
      `,
      { nodeId, limit: neo4j.int(this.config.maxNeighbors) },
    );

    return result.records.map((record) => ({
      nodeId: record.get('neighborId'),
      relationship: record.get('relType'),
      weight: record.get('weight'),
    }));
  }

  /**
   * Get neighbors for random walk
   */
  private async getNeighborsForWalk(
    session: Session,
    nodeId: string,
  ): Promise<Array<{ nodeId: string; relationship: string; prevDistance: number }>> {
    const result = await session.run(
      `
      MATCH (n)-[r]-(neighbor)
      WHERE n.id = $nodeId OR id(n) = toInteger($nodeId)
      RETURN neighbor.id as neighborId, type(r) as relType
      LIMIT 100
      `,
      { nodeId },
    );

    return result.records.map((record) => ({
      nodeId: record.get('neighborId'),
      relationship: record.get('relType'),
      prevDistance: 1, // Simplified - would need to track actual distance
    }));
  }

  /**
   * Get node feature vector
   */
  private async getNodeFeatureVector(
    session: Session,
    nodeId: string,
  ): Promise<number[]> {
    const features = await this.getNodeFeatures(session, nodeId);

    // Create feature vector from node properties
    const vector: number[] = [];

    // Add degree features
    vector.push(features.degree);
    vector.push(features.inDegree);
    vector.push(features.outDegree);

    // Add label encoding (one-hot style)
    const commonLabels = ['Entity', 'Person', 'Organization', 'Location', 'Event'];
    for (const label of commonLabels) {
      vector.push(features.labels.includes(label) ? 1 : 0);
    }

    // Add property-based features
    if (features.properties.confidence !== undefined) {
      vector.push(Number(features.properties.confidence) || 0);
    }

    return vector;
  }

  /**
   * Get node degree
   */
  private async getNodeDegree(session: Session, nodeId: string): Promise<number> {
    const result = await session.run(
      `
      MATCH (n)-[r]-()
      WHERE n.id = $nodeId OR id(n) = toInteger($nodeId)
      RETURN count(r) as degree
      `,
      { nodeId },
    );

    return result.records[0]?.get('degree').toNumber() || 1;
  }

  /**
   * Aggregate feature vectors
   */
  private aggregateFeatures(features: number[][]): number[] {
    if (features.length === 0) {
      return new Array(this.config.dimensions).fill(0);
    }

    const dim = features[0].length;
    const result = new Array(dim).fill(0);

    switch (this.config.aggregationMethod) {
      case 'max':
        for (let i = 0; i < dim; i++) {
          result[i] = Math.max(...features.map((f) => f[i] || 0));
        }
        break;

      case 'mean':
      default:
        for (const feature of features) {
          for (let i = 0; i < dim; i++) {
            result[i] += (feature[i] || 0) / features.length;
          }
        }
        break;
    }

    return result;
  }

  /**
   * Calculate attention weight
   */
  private calculateAttention(
    sourceFeatures: number[],
    targetFeatures: number[],
    relationshipWeight: number,
  ): number {
    // Simple attention: dot product + relationship weight
    let dotProduct = 0;
    const dim = Math.min(sourceFeatures.length, targetFeatures.length);

    for (let i = 0; i < dim; i++) {
      dotProduct += sourceFeatures[i] * targetFeatures[i];
    }

    // Apply softmax-like transformation
    return Math.exp(dotProduct * relationshipWeight);
  }

  /**
   * Project features to target dimension
   */
  private projectToTargetDimension(features: number[]): number[] {
    const targetDim = this.config.dimensions;

    if (features.length === targetDim) {
      return features;
    }

    if (features.length < targetDim) {
      // Pad with zeros
      return [...features, ...new Array(targetDim - features.length).fill(0)];
    }

    // Reduce dimension using simple averaging
    const result = new Array(targetDim).fill(0);
    const ratio = features.length / targetDim;

    for (let i = 0; i < targetDim; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += features[j];
      }
      result[i] = sum / (end - start);
    }

    // Normalize
    const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < result.length; i++) {
        result[i] /= norm;
      }
    }

    return result;
  }

  /**
   * Store embedding back to Neo4j
   */
  async storeEmbedding(
    nodeId: string,
    embedding: number[],
    investigationId: string,
  ): Promise<void> {
    await this.ensureInitialized();

    const session = this.driver!.session({ database: this.config.database });

    try {
      await session.run(
        `
        MATCH (n)
        WHERE n.id = $nodeId OR id(n) = toInteger($nodeId)
        SET n.embedding = $embedding,
            n.embeddingDimension = $dimension,
            n.embeddingAlgorithm = $algorithm,
            n.embeddingUpdatedAt = datetime()
        `,
        {
          nodeId,
          embedding,
          dimension: neo4j.int(embedding.length),
          algorithm: this.config.algorithm,
        },
      );

      logger.debug('Embedding stored in Neo4j', { nodeId });
    } finally {
      await session.close();
    }
  }

  /**
   * Find similar nodes by embedding
   */
  async findSimilarNodes(
    embedding: number[],
    topK: number = 10,
    threshold: number = 0.7,
  ): Promise<Array<{ nodeId: string; similarity: number }>> {
    await this.ensureInitialized();

    const session = this.driver!.session({ database: this.config.database });

    try {
      // Use Neo4j's vector similarity (requires GDS or custom implementation)
      const result = await session.run(
        `
        MATCH (n)
        WHERE n.embedding IS NOT NULL
        WITH n, gds.similarity.cosine(n.embedding, $embedding) as similarity
        WHERE similarity >= $threshold
        RETURN n.id as nodeId, similarity
        ORDER BY similarity DESC
        LIMIT $topK
        `,
        {
          embedding,
          threshold,
          topK: neo4j.int(topK),
        },
      );

      return result.records.map((record) => ({
        nodeId: record.get('nodeId'),
        similarity: record.get('similarity'),
      }));
    } catch (error) {
      // Fallback if GDS not available
      logger.warn('GDS similarity not available, using fallback');
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Cache embedding
   */
  private cacheEmbedding(nodeId: string, embedding: number[]): void {
    this.embeddingCache.set(nodeId, {
      embedding,
      timestamp: Date.now(),
    });

    // Clean old entries
    const now = Date.now();
    for (const [key, value] of this.embeddingCache.entries()) {
      if (now - value.timestamp > this.config.cacheTTL) {
        this.embeddingCache.delete(key);
      }
    }
  }

  /**
   * Get cached embedding
   */
  private getCached(nodeId: string): number[] | null {
    const cached = this.embeddingCache.get(nodeId);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.embedding;
    }
    return null;
  }

  /**
   * Ensure initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.initialized = false;
      logger.info('Neo4j connection closed');
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    cacheSize: number;
    algorithm: string;
    dimensions: number;
    initialized: boolean;
  } {
    return {
      cacheSize: this.embeddingCache.size,
      algorithm: this.config.algorithm,
      dimensions: this.config.dimensions,
      initialized: this.initialized,
    };
  }
}

export default Neo4jEmbeddings;
