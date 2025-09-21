/**
 * GraphRAG GraphQL Resolvers
 * Provides GraphQL interface for GraphRAG operations
 */

const GraphRAGService = require('../../services/GraphRAGService');
const EmbeddingService = require('../../services/EmbeddingService');
const LLMService = require('../../services/LLMService');
const { getNeo4jDriver, getRedisClient } = require('../../config/database');
const logger = require('../../utils/logger');
const tracingService = require('../../monitoring/tracing');

// Initialize services
let graphRAGService;
let embeddingService;
let llmService;

function initializeServices() {
  if (!graphRAGService) {
    const neo4jDriver = getNeo4jDriver();
    const redisClient = getRedisClient();
    
    embeddingService = new EmbeddingService();
    llmService = new LLMService();
    graphRAGService = new GraphRAGService(neo4jDriver, embeddingService, llmService, redisClient);
  }
}

const graphragResolvers = {
  Query: {
    /**
     * Query the knowledge graph using GraphRAG
     */
    graphRAGQuery: tracingService.wrapResolver('graphRAGQuery', async (_, { input }, { user }) => {
      initializeServices();

      try {
        const result = await graphRAGService.query({
          query: input.query,
          investigationId: input.investigationId,
          context: input.context || {},
          options: {
            maxResults: input.maxResults || 20,
            depth: input.depth || 2,
            expansionLimit: input.expansionLimit || 15,
            model: input.model,
            temperature: input.temperature,
            maxTokens: input.maxTokens
          },
          tenantId: user?.tenantId || 'default'
        });

        logger.info('GraphRAG query processed', {
          userId: user?.id,
          investigationId: input.investigationId,
          queryLength: input.query.length,
          success: result.success
        });

        return result;
      } catch (error) {
        logger.error('GraphRAG query failed in resolver', {
          userId: user?.id,
          error: error.message
        });
        throw new Error(`GraphRAG query failed: ${error.message}`);
      }
    }),

    /**
     * Get GraphRAG service health and metrics
     */
    async graphRAGHealth(_, {}, { user }) {
      initializeServices();

      try {
        const health = graphRAGService.getHealth();
        const embeddingHealth = embeddingService.getHealth();
        const llmHealth = llmService.getHealth();

        return {
          status: 'healthy',
          services: {
            graphRAG: health,
            embedding: embeddingHealth,
            llm: llmHealth
          },
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        logger.error('GraphRAG health check failed', {
          userId: user?.id,
          error: error.message
        });
        
        return {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    },

    /**
     * Find similar entities using embeddings
     */
    async findSimilarEntities(_, { input }, { user }) {
      initializeServices();

      try {
        const neo4jDriver = getNeo4jDriver();
        const session = neo4jDriver.session();

        // Get entity content
        const entityQuery = `
          MATCH (e:Entity {id: $entityId})-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
          RETURN e.label as label, e.description as description, e.properties as properties
        `;

        const entityResult = await session.run(entityQuery, {
          entityId: input.entityId,
          investigationId: input.investigationId
        });

        if (entityResult.records.length === 0) {
          throw new Error('Entity not found');
        }

        const entity = entityResult.records[0];
        const entityText = `${entity.get('label')} ${entity.get('description')} ${JSON.stringify(entity.get('properties'))}`;

        // Get all other entities for comparison
        const allEntitiesQuery = `
          MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
          WHERE e.id <> $entityId
          RETURN e.id as id, e.label as label, e.description as description, e.properties as properties
          LIMIT 100
        `;

        const allEntitiesResult = await session.run(allEntitiesQuery, {
          investigationId: input.investigationId,
          entityId: input.entityId
        });

        await session.close();

        // Generate embeddings and find similar
        const corpusTexts = allEntitiesResult.records.map(record => 
          `${record.get('label')} ${record.get('description')} ${JSON.stringify(record.get('properties'))}`
        );

        const similar = await embeddingService.findSimilar(entityText, corpusTexts, {
          topK: input.limit || 10,
          threshold: input.threshold || 0.7
        });

        const results = similar.map(item => ({
          entity: {
            id: allEntitiesResult.records[item.index].get('id'),
            label: allEntitiesResult.records[item.index].get('label'),
            description: allEntitiesResult.records[item.index].get('description'),
            properties: allEntitiesResult.records[item.index].get('properties')
          },
          similarity: item.similarity
        }));

        return {
          success: true,
          results,
          queryEntity: {
            id: input.entityId,
            label: entity.get('label'),
            description: entity.get('description'),
            properties: entity.get('properties')
          }
        };

      } catch (error) {
        logger.error('Find similar entities failed', {
          userId: user?.id,
          entityId: input.entityId,
          error: error.message
        });

        return {
          success: false,
          error: error.message,
          results: []
        };
      }
    }
  },

  Mutation: {
    /**
     * Generate embeddings for entities in an investigation
     */
    async generateEntityEmbeddings(_, { input }, { user }) {
      initializeServices();

      try {
        const neo4jDriver = getNeo4jDriver();
        const session = neo4jDriver.session();

        // Get entities without embeddings
        const entitiesQuery = `
          MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
          WHERE e.embedding IS NULL
          RETURN e.id as id, e.label as label, e.description as description, e.properties as properties
          LIMIT $batchSize
        `;

        const entitiesResult = await session.run(entitiesQuery, {
          investigationId: input.investigationId,
          batchSize: input.batchSize || 50
        });

        if (entitiesResult.records.length === 0) {
          await session.close();
          return {
            success: true,
            message: 'No entities need embedding generation',
            processedCount: 0,
            totalEntities: 0
          };
        }

        const entities = entitiesResult.records.map(record => ({
          id: record.get('id'),
          text: `${record.get('label')} ${record.get('description')} ${JSON.stringify(record.get('properties'))}`
        }));

        // Generate embeddings
        const embeddings = await embeddingService.generateEmbeddings(
          entities.map(e => e.text),
          input.model
        );

        // Store embeddings in Neo4j
        for (let i = 0; i < entities.length; i++) {
          await session.run(
            'MATCH (e:Entity {id: $id}) SET e.embedding = $embedding, e.embeddingModel = $model, e.embeddingGeneratedAt = datetime()',
            {
              id: entities[i].id,
              embedding: embeddings[i],
              model: input.model || embeddingService.config.model
            }
          );
        }

        await session.close();

        logger.info('Entity embeddings generated', {
          userId: user?.id,
          investigationId: input.investigationId,
          processedCount: entities.length,
          model: input.model
        });

        return {
          success: true,
          message: `Generated embeddings for ${entities.length} entities`,
          processedCount: entities.length,
          totalEntities: entities.length
        };

      } catch (error) {
        logger.error('Generate entity embeddings failed', {
          userId: user?.id,
          investigationId: input.investigationId,
          error: error.message
        });

        throw new Error(`Embedding generation failed: ${error.message}`);
      }
    },

    /**
     * Test GraphRAG services
     */
    async testGraphRAGServices(_, {}, { user }) {
      initializeServices();

      try {
        const embeddingTest = await embeddingService.test();
        const llmTest = await llmService.test();

        return {
          success: embeddingTest.success && llmTest.success,
          embedding: embeddingTest,
          llm: llmTest,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        logger.error('GraphRAG services test failed', {
          userId: user?.id,
          error: error.message
        });

        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }
};

module.exports = graphragResolvers;