/**
 * GraphRAG Service - Retrieval Augmented Generation over Knowledge Graphs
 * Combines graph traversal with LLM generation for intelligent responses
 */

const { v4: uuidv4 } = require('uuid');
import logger from '../utils/logger.js';
const { trackGraphOperation, trackError } = require('../monitoring/metrics');

class GraphRAGService {
  constructor(neo4jDriver, embedService, llmService, redisClient) {
    this.neo4jDriver = neo4jDriver;
    this.embedService = embedService;
    this.llmService = llmService;
    this.redis = redisClient;
    this.logger = logger;

    this.metrics = {
      totalQueries: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      relevanceScores: [],
      contextSizes: [],
    };

    // Configuration
    this.config = {
      maxContextSize: 4000, // tokens
      maxRetrievalDepth: 3,
      minRelevanceScore: 0.7,
      embeddingDimension: 384,
      cacheTTL: 3600, // 1 hour
      llmModel: 'gpt-3.5-turbo',
      embeddingModel: 'text-embedding-3-small',
    };
  }

  /**
   * Main GraphRAG query method
   */
  async query(params) {
    const { query, investigationId, context = {}, options = {} } = params;

    const queryId = uuidv4();
    const startTime = Date.now();

    return trackGraphOperation('graphrag_query', investigationId, async () => {
      try {
        logger.info('GraphRAG query initiated', {
          queryId,
          investigationId,
          queryLength: query.length,
        });

        // Step 1: Generate query embedding
        const queryEmbedding = await this.generateQueryEmbedding(query);

        // Step 2: Retrieve relevant graph context
        const graphContext = await this.retrieveGraphContext(
          queryEmbedding,
          investigationId,
          options,
        );

        // Step 3: Rank and filter retrieved content
        const rankedContext = await this.rankContext(graphContext, query);

        // Step 4: Build context prompt
        const contextPrompt = await this.buildContextPrompt(
          rankedContext,
          query,
          context,
        );

        // Step 5: Generate response using LLM
        const response = await this.generateResponse(contextPrompt, options);

        // Step 6: Post-process and validate response
        const finalResponse = await this.postProcessResponse(
          response,
          rankedContext,
        );

        const responseTime = Date.now() - startTime;
        this.updateMetrics(responseTime, rankedContext, finalResponse);

        logger.info('GraphRAG query completed', {
          queryId,
          investigationId,
          responseTime,
          contextSize: rankedContext.length,
          relevanceScore: finalResponse.relevanceScore,
        });

        return {
          success: true,
          queryId,
          response: finalResponse.content,
          metadata: {
            contextSize: rankedContext.length,
            relevanceScore: finalResponse.relevanceScore,
            sources: rankedContext.map((c) => ({
              type: c.type,
              id: c.id,
              score: c.score,
            })),
            responseTime,
          },
        };
      } catch (error) {
        trackError('graphrag_service', 'QueryError');
        logger.error('GraphRAG query failed', {
          queryId,
          investigationId,
          error: error.message,
        });

        return {
          success: false,
          queryId,
          error: error.message,
        };
      }
    });
  }

  /**
   * Generate embedding for query text
   */
  async generateQueryEmbedding(query) {
    const cacheKey = `query_embed:${Buffer.from(query).toString('base64').slice(0, 32)}`;

    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2;
        return JSON.parse(cached);
      }
    }

    try {
      // Use ML service or OpenAI API for embeddings
      const embedding = await this.embedService.generateEmbedding({
        text: query,
        model: this.config.embeddingModel,
      });

      if (this.redis) {
        await this.redis.setex(
          cacheKey,
          this.config.cacheTTL,
          JSON.stringify(embedding),
        );
      }

      return embedding;
    } catch (error) {
      logger.error('Failed to generate query embedding', {
        error: error.message,
      });
      throw new Error('Embedding generation failed');
    }
  }

  /**
   * Retrieve relevant graph context using vector similarity and graph traversal
   */
  async retrieveGraphContext(queryEmbedding, investigationId, options) {
    const session = this.neo4jDriver.session();
    const context = [];

    try {
      // 1. Vector similarity search on entity embeddings
      const vectorResults = await this.vectorSimilaritySearch(
        session,
        queryEmbedding,
        investigationId,
        options,
      );
      context.push(...vectorResults);

      // 2. Graph traversal from relevant entities
      for (const item of vectorResults.slice(0, 5)) {
        // Top 5 entities
        const graphContext = await this.expandGraphContext(
          session,
          item.id,
          investigationId,
          options,
        );
        context.push(...graphContext);
      }

      // 3. Keyword/fulltext search fallback
      const keywordResults = await this.keywordSearch(
        session,
        this.extractKeywords(options.query || ''),
        investigationId,
      );
      context.push(...keywordResults);

      return context;
    } finally {
      await session.close();
    }
  }

  /**
   * Vector similarity search against stored entity embeddings
   */
  async vectorSimilaritySearch(
    session,
    queryEmbedding,
    investigationId,
    options,
  ) {
    try {
      // This would ideally use a vector database like Pinecone, Weaviate, or Neo4j Vector Index
      // For now, we'll use a simplified approach with stored embeddings
      const query = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        WHERE e.embedding IS NOT NULL
        WITH e, 
             gds.similarity.cosine(e.embedding, $queryEmbedding) AS similarity
        WHERE similarity > $minScore
        RETURN e.id as id, e.label as label, e.type as type, e.description as description,
               e.properties as properties, similarity
        ORDER BY similarity DESC
        LIMIT $limit
      `;

      const result = await session.run(query, {
        investigationId,
        queryEmbedding,
        minScore: this.config.minRelevanceScore,
        limit: options.maxResults || 20,
      });

      return result.records.map((record) => ({
        type: 'entity',
        id: record.get('id'),
        label: record.get('label'),
        entityType: record.get('type'),
        description: record.get('description'),
        properties: record.get('properties'),
        score: record.get('similarity'),
        content: this.formatEntityContent(record),
      }));
    } catch (error) {
      logger.warn(
        'Vector similarity search failed, falling back to keyword search',
        {
          error: error.message,
        },
      );
      return [];
    }
  }

  /**
   * Expand context by traversing graph relationships
   */
  async expandGraphContext(session, entityId, investigationId, options) {
    const depth = Math.min(options.depth || 2, this.config.maxRetrievalDepth);

    const query = `
      MATCH (start:Entity {id: $entityId})-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
      CALL {
        WITH start
        MATCH path = (start)-[*1..${depth}]-(related:Entity)
        WHERE related.id <> start.id
        RETURN related, length(path) as distance
      }
      WITH related, distance
      ORDER BY distance, related.createdAt DESC
      LIMIT $limit
      RETURN related.id as id, related.label as label, related.type as type,
             related.description as description, related.properties as properties,
             distance
    `;

    const result = await session.run(query, {
      entityId,
      investigationId,
      limit: options.expansionLimit || 15,
    });

    return result.records.map((record) => ({
      type: 'related_entity',
      id: record.get('id'),
      label: record.get('label'),
      entityType: record.get('type'),
      description: record.get('description'),
      properties: record.get('properties'),
      distance: record.get('distance'),
      score: 1 / (1 + record.get('distance')), // Distance-based score
      content: this.formatEntityContent(record),
    }));
  }

  /**
   * Keyword-based fallback search
   */
  async keywordSearch(session, keywords, investigationId) {
    if (!keywords.length) return [];

    const query = `
      CALL db.index.fulltext.queryNodes('entity_search', $searchTerm) 
      YIELD node, score
      MATCH (node)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
      RETURN node.id as id, node.label as label, node.type as type,
             node.description as description, node.properties as properties,
             score
      ORDER BY score DESC
      LIMIT 10
    `;

    const searchTerm = keywords.join(' OR ');
    const result = await session.run(query, {
      searchTerm,
      investigationId,
    });

    return result.records.map((record) => ({
      type: 'keyword_match',
      id: record.get('id'),
      label: record.get('label'),
      entityType: record.get('type'),
      description: record.get('description'),
      properties: record.get('properties'),
      score: record.get('score'),
      content: this.formatEntityContent(record),
    }));
  }

  /**
   * Rank and filter context based on relevance
   */
  async rankContext(context, query) {
    // Remove duplicates
    const uniqueContext = context.filter(
      (item, index, self) =>
        index ===
        self.findIndex((t) => t.id === item.id && t.type === item.type),
    );

    // Sort by score descending
    const rankedContext = uniqueContext
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20); // Top 20 items

    // Calculate content size and truncate if needed
    let totalTokens = 0;
    const finalContext = [];

    for (const item of rankedContext) {
      const itemTokens = this.estimateTokens(item.content);
      if (totalTokens + itemTokens > this.config.maxContextSize) break;

      totalTokens += itemTokens;
      finalContext.push(item);
    }

    return finalContext;
  }

  /**
   * Build context prompt for LLM
   */
  async buildContextPrompt(context, query, userContext) {
    const contextString = context
      .map((item) => {
        return `[${item.type.toUpperCase()}] ${item.label || item.id}:
${item.description || 'No description available'}
${item.content}
Relevance: ${(item.score || 0).toFixed(3)}
---`;
      })
      .join('\n\n');

    const prompt = `You are an intelligence analyst with access to a knowledge graph. Answer the user's question based on the provided context from the graph database.

CONTEXT FROM KNOWLEDGE GRAPH:
${contextString}

USER CONTEXT:
${JSON.stringify(userContext, null, 2)}

USER QUESTION: ${query}

INSTRUCTIONS:
- Provide a comprehensive answer based on the graph context
- Reference specific entities, relationships, and data points from the context
- If the context doesn't contain sufficient information, clearly state what's missing
- Highlight confidence levels and data quality where relevant
- Structure your response clearly with key findings upfront
- Include relevant context IDs in your response for traceability

RESPONSE:`;

    return prompt;
  }

  /**
   * Generate response using LLM
   */
  async generateResponse(prompt, options) {
    try {
      const response = await this.llmService.complete({
        prompt,
        model: options.model || this.config.llmModel,
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.3,
      });

      return response;
    } catch (error) {
      logger.error('LLM response generation failed', { error: error.message });
      throw new Error('Response generation failed');
    }
  }

  /**
   * Post-process and validate response
   */
  async postProcessResponse(response, context) {
    // Calculate relevance score based on context utilization
    const relevanceScore = this.calculateRelevanceScore(response, context);

    return {
      content: response,
      relevanceScore,
      contextUtilization: this.calculateContextUtilization(response, context),
    };
  }

  /**
   * Helper methods
   */
  formatEntityContent(record) {
    const properties = record.get('properties') || {};
    const propString = Object.entries(properties)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    return `${record.get('description') || ''} ${propString ? `Properties: ${propString}` : ''}`.trim();
  }

  extractKeywords(query) {
    // Simple keyword extraction - could be enhanced with NLP
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          ![
            'this',
            'that',
            'with',
            'from',
            'what',
            'when',
            'where',
            'why',
          ].includes(word),
      );
  }

  estimateTokens(text) {
    // Rough token estimation (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }

  calculateRelevanceScore(response, context) {
    // Simple relevance scoring - could be enhanced
    const responseWords = response.toLowerCase().split(/\s+/);
    const contextWords = context.flatMap((c) =>
      (c.content + ' ' + c.label).toLowerCase().split(/\s+/),
    );

    const matches = responseWords.filter((word) => contextWords.includes(word));
    return Math.min(matches.length / responseWords.length, 1);
  }

  calculateContextUtilization(response, context) {
    return {
      totalItems: context.length,
      referencedItems: context.filter(
        (c) => response.includes(c.id) || response.includes(c.label),
      ).length,
    };
  }

  updateMetrics(responseTime, context, response) {
    this.metrics.totalQueries++;

    const currentAvg = this.metrics.averageResponseTime;
    this.metrics.averageResponseTime = currentAvg
      ? (currentAvg + responseTime) / 2
      : responseTime;

    this.metrics.relevanceScores.push(response.relevanceScore);
    this.metrics.contextSizes.push(context.length);

    // Keep only last 100 entries
    if (this.metrics.relevanceScores.length > 100) {
      this.metrics.relevanceScores = this.metrics.relevanceScores.slice(-100);
    }
    if (this.metrics.contextSizes.length > 100) {
      this.metrics.contextSizes = this.metrics.contextSizes.slice(-100);
    }
  }

  /**
   * Health check and metrics
   */
  getHealth() {
    const avgRelevance =
      this.metrics.relevanceScores.length > 0
        ? this.metrics.relevanceScores.reduce((a, b) => a + b, 0) /
          this.metrics.relevanceScores.length
        : 0;

    const avgContextSize =
      this.metrics.contextSizes.length > 0
        ? this.metrics.contextSizes.reduce((a, b) => a + b, 0) /
          this.metrics.contextSizes.length
        : 0;

    return {
      status: 'healthy',
      metrics: {
        totalQueries: this.metrics.totalQueries,
        averageResponseTime: Math.round(this.metrics.averageResponseTime),
        cacheHitRate: Math.round(this.metrics.cacheHitRate * 100) / 100,
        averageRelevance: Math.round(avgRelevance * 1000) / 1000,
        averageContextSize: Math.round(avgContextSize),
      },
      config: this.config,
    };
  }
}

module.exports = GraphRAGService;
