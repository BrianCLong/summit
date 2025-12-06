import { getNeo4jDriver } from '../config/database.js';
import { EmbeddingService } from './EmbeddingService.js';
import logger from '../utils/logger.js';

export class SemanticSearchService {
  constructor(private embeddingService = new EmbeddingService()) {}

  /**
   * Search for nodes semantically similar to the query text.
   * Assumes a vector index exists on the `embedding` property of `Entity` nodes.
   */
  async search(queryText: string, tenantId: string, limit = 10, minScore = 0.7) {
    const embedding = await this.embeddingService.getEmbedding(queryText);
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // OPTIMIZATION: Over-fetching to solve the multi-tenant recall issue.
      // We fetch 5x the limit globally, then filter by tenantId in the main query logic.
      // This is a workaround until we can use filtered vector search (Neo4j 5.x feature dependent).
      const fetchLimit = limit * 5;

      const cypher = `
        CALL db.index.vector.queryNodes('entity_embeddings', $fetchLimit, $embedding)
        YIELD node, score
        WHERE node.tenantId = $tenantId AND score >= $minScore
        RETURN
          node.id AS id,
          node.label AS label,
          node.type AS type,
          score
        LIMIT $limit
      `;

      const result = await session.run(cypher, {
        embedding,
        fetchLimit, // Request more from the index
        limit,      // Return only the requested amount
        minScore,
        tenantId,
      });

      return result.records.map((r) => ({
        id: r.get('id'),
        label: r.get('label'),
        type: r.get('type'),
        score: r.get('score'),
      }));
    } catch (error) {
      logger.error('Semantic search failed', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Alias for backward compatibility
  async searchCases(queryText: string, tenantId: string, limit = 10) {
      return this.search(queryText, tenantId, limit);
  }

  /**
   * Create the vector index if it doesn't exist.
   */
  async createIndex(dimensions = 1536, similarity = 'cosine') {
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      // Check if index exists
      const check = await session.run("SHOW INDEXES WHERE name = 'entity_embeddings'");
      if (check.records.length === 0) {
        await session.run(`
          CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS
          FOR (n:Entity) ON (n.embedding)
          OPTIONS {indexConfig: {
            ` + "`vector.dimensions`: $dimensions," + `
            ` + "`vector.similarity_function`: $similarity" + `
          }}
        `, { dimensions, similarity });
        logger.info('Created vector index: entity_embeddings');
      }

      // Ensure other performance indexes exist
      await session.run(`
        CREATE INDEX entity_tenant_inv_id IF NOT EXISTS
        FOR (n:Entity) ON (n.tenantId, n.investigationId, n.id)
      `);

    } finally {
      await session.close();
    }
  }

  /**
   * Index a node by generating and setting its embedding.
   * This is required for the semantic search to work on new data.
   */
  async indexNode(nodeId: string, text: string) {
      const embedding = await this.embeddingService.getEmbedding(text);
      const driver = getNeo4jDriver();
      const session = driver.session();
      try {
          await session.run(`
            MATCH (n:Entity {id: $nodeId})
            SET n.embedding = $embedding
          `, { nodeId, embedding });
          logger.info(`Indexed node ${nodeId}`);
      } catch (error) {
          logger.error(`Failed to index node ${nodeId}`, error);
          throw error;
      } finally {
          await session.close();
      }
  }
}

export default new SemanticSearchService();
