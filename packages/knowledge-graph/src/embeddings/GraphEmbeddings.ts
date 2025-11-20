/**
 * Graph Embeddings (Node2Vec, DeepWalk, GNN)
 */

import { Driver } from 'neo4j-driver';

export interface EmbeddingConfig {
  dimensions: number;
  walkLength: number;
  numWalks: number;
  windowSize: number;
  p?: number; // Return parameter for Node2Vec
  q?: number; // In-out parameter for Node2Vec
}

export interface NodeEmbedding {
  nodeId: string;
  embedding: number[];
  algorithm: 'node2vec' | 'deepwalk' | 'gnn';
  metadata?: Record<string, any>;
}

export class GraphEmbeddings {
  constructor(private driver: Driver) {}

  /**
   * Generate Node2Vec embeddings
   * Node2Vec uses biased random walks to generate node embeddings
   */
  async generateNode2Vec(
    config: EmbeddingConfig = {
      dimensions: 128,
      walkLength: 80,
      numWalks: 10,
      windowSize: 10,
      p: 1.0,
      q: 1.0,
    },
  ): Promise<NodeEmbedding[]> {
    const session = this.driver.session();
    try {
      // Note: This requires Neo4j Graph Data Science library
      // Install with: CALL gds.graph.project() first

      // Create in-memory graph
      await session.run(`
        CALL gds.graph.project(
          'knowledgeGraph',
          '*',
          '*'
        )
      `);

      // Run Node2Vec algorithm
      const result = await session.run(
        `
        CALL gds.node2vec.stream('knowledgeGraph', {
          embeddingDimension: $dimensions,
          walkLength: $walkLength,
          walksPerNode: $numWalks,
          windowSize: $windowSize,
          returnFactor: $p,
          inOutFactor: $q
        })
        YIELD nodeId, embedding
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as nodeId, embedding
        LIMIT 10000
        `,
        {
          dimensions: config.dimensions,
          walkLength: config.walkLength,
          numWalks: config.numWalks,
          windowSize: config.windowSize,
          p: config.p || 1.0,
          q: config.q || 1.0,
        },
      );

      const embeddings: NodeEmbedding[] = result.records.map((record) => ({
        nodeId: record.get('nodeId'),
        embedding: record.get('embedding'),
        algorithm: 'node2vec',
      }));

      // Drop the in-memory graph
      await session.run(`CALL gds.graph.drop('knowledgeGraph')`);

      return embeddings;
    } catch (error) {
      console.error('Node2Vec generation error:', error);
      // Return empty array if GDS is not available
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Generate DeepWalk embeddings
   */
  async generateDeepWalk(
    config: EmbeddingConfig = {
      dimensions: 128,
      walkLength: 80,
      numWalks: 10,
      windowSize: 10,
    },
  ): Promise<NodeEmbedding[]> {
    // DeepWalk is similar to Node2Vec with p=1, q=1
    return this.generateNode2Vec({
      ...config,
      p: 1.0,
      q: 1.0,
    });
  }

  /**
   * Store embeddings in the graph
   */
  async storeEmbeddings(embeddings: NodeEmbedding[]): Promise<void> {
    const session = this.driver.session();
    try {
      for (const embedding of embeddings) {
        await session.run(
          `
          MATCH (n {id: $nodeId})
          SET n.embedding = $embedding,
              n.embeddingAlgorithm = $algorithm,
              n.embeddingDimensions = $dimensions
          `,
          {
            nodeId: embedding.nodeId,
            embedding: embedding.embedding,
            algorithm: embedding.algorithm,
            dimensions: embedding.embedding.length,
          },
        );
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Compute cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Find similar nodes using embeddings
   */
  async findSimilarNodes(
    nodeId: string,
    topK = 10,
    minSimilarity = 0.7,
  ): Promise<Array<{ nodeId: string; similarity: number }>> {
    const session = this.driver.session();
    try {
      // Get target node embedding
      const targetResult = await session.run(
        `
        MATCH (n {id: $nodeId})
        RETURN n.embedding as embedding
        `,
        { nodeId },
      );

      if (targetResult.records.length === 0) {
        return [];
      }

      const targetEmbedding = targetResult.records[0].get('embedding');

      // Find similar nodes
      // Note: This is a simplified version. In production, use vector indexes
      const result = await session.run(
        `
        MATCH (n)
        WHERE n.id <> $nodeId AND exists(n.embedding)
        RETURN n.id as nodeId, n.embedding as embedding
        LIMIT 1000
        `,
        { nodeId },
      );

      const similarities = result.records
        .map((record) => ({
          nodeId: record.get('nodeId'),
          similarity: this.cosineSimilarity(targetEmbedding, record.get('embedding')),
        }))
        .filter((item) => item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      return similarities;
    } finally {
      await session.close();
    }
  }

  /**
   * Transfer learning: Use pre-trained embeddings
   */
  async transferEmbeddings(
    pretrainedEmbeddings: Map<string, number[]>,
  ): Promise<void> {
    const session = this.driver.session();
    try {
      for (const [nodeId, embedding] of pretrainedEmbeddings.entries()) {
        await session.run(
          `
          MATCH (n {id: $nodeId})
          SET n.embedding = $embedding,
              n.embeddingAlgorithm = 'transfer_learning'
          `,
          { nodeId, embedding },
        );
      }
    } finally {
      await session.close();
    }
  }
}
