/**
 * GraphRAG HTTP Server
 * Express-based API for the GraphRAG service
 */

import express, { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { GraphRAGOrchestrator, createGraphRAGOrchestrator } from './GraphRAGOrchestrator.js';
import { RetrievalQuery, GraphRAGConfig } from './types/index.js';

const tracer = trace.getTracer('graphrag-server');

// Middleware for request tracing
function tracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  span.setAttribute('http.method', req.method);
  span.setAttribute('http.url', req.url);

  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    span.setStatus({
      code: res.statusCode < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
    });
    span.end();
  });

  next();
}

// Error handler middleware
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
}

export function createServer(orchestrator: GraphRAGOrchestrator): express.Application {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(tracingMiddleware);

  // Health check
  app.get('/health', async (req, res) => {
    try {
      const health = await orchestrator.healthCheck();
      res.status(health.healthy ? 200 : 503).json({
        status: health.healthy ? 'healthy' : 'unhealthy',
        service: 'graphrag',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        components: health.components,
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Main query endpoint
  app.post('/query', async (req, res) => {
    try {
      const {
        query,
        tenantId,
        userId,
        maxHops = 3,
        maxNodes = 1000,
        maxDocuments = 20,
        minRelevance = 0.3,
        includeCitations = true,
        includeGraphPaths = true,
        includeCounterfactuals = false,
        includeSensitivityAnalysis = false,
        temporalScope,
        entityFilters,
        relationshipFilters,
        policyContext,
        maxTokens,
        temperature,
      } = req.body;

      if (!query || !tenantId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'query and tenantId are required',
        });
      }

      const retrievalQuery: RetrievalQuery = {
        query,
        tenantId,
        userId,
        maxHops,
        maxNodes,
        maxDocuments,
        minRelevance,
        includeCitations,
        includeGraphPaths,
        includeCounterfactuals,
        temporalScope,
        entityFilters,
        relationshipFilters,
        policyContext,
      };

      const response = await orchestrator.query(retrievalQuery, {
        includeCounterfactuals,
        includeSensitivityAnalysis,
        temporalScope: temporalScope ? {
          from: temporalScope.from ? new Date(temporalScope.from) : undefined,
          to: temporalScope.to ? new Date(temporalScope.to) : undefined,
        } : undefined,
        policyContext,
        maxTokens,
        temperature,
      });

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Query error:', error);
      res.status(500).json({
        error: 'Query Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Natural language to Cypher
  app.post('/nl-to-cypher', async (req, res) => {
    try {
      const { query, tenantId } = req.body;

      if (!query || !tenantId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'query and tenantId are required',
        });
      }

      const result = await orchestrator.naturalLanguageToCypher(query, tenantId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('NL to Cypher error:', error);
      res.status(500).json({
        error: 'Conversion Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Index document
  app.post('/index', async (req, res) => {
    try {
      const { documentId, title, content, tenantId, metadata } = req.body;

      if (!documentId || !content || !tenantId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'documentId, content, and tenantId are required',
        });
      }

      const chunksIndexed = await orchestrator.indexDocument(
        documentId,
        title || documentId,
        content,
        tenantId,
        metadata,
      );

      res.json({
        success: true,
        data: {
          documentId,
          chunksIndexed,
        },
      });
    } catch (error) {
      console.error('Index error:', error);
      res.status(500).json({
        error: 'Indexing Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Batch index documents
  app.post('/index/batch', async (req, res) => {
    try {
      const { documents, tenantId } = req.body;

      if (!documents || !Array.isArray(documents) || !tenantId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'documents array and tenantId are required',
        });
      }

      const results = await Promise.all(
        documents.map(async (doc: any) => {
          try {
            const chunks = await orchestrator.indexDocument(
              doc.id,
              doc.title || doc.id,
              doc.content,
              tenantId,
              doc.metadata,
            );
            return { id: doc.id, success: true, chunks };
          } catch (error) {
            return {
              id: doc.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }),
      );

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      res.json({
        success: failed === 0,
        data: {
          total: documents.length,
          successful,
          failed,
          results,
        },
      });
    } catch (error) {
      console.error('Batch index error:', error);
      res.status(500).json({
        error: 'Batch Indexing Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.use(errorHandler);

  return app;
}

// Main entry point
async function main() {
  const config: GraphRAGConfig = {
    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    retrieval: {
      maxHops: parseInt(process.env.MAX_HOPS || '3', 10),
      maxNodes: parseInt(process.env.MAX_NODES || '1000', 10),
      maxDocuments: parseInt(process.env.MAX_DOCUMENTS || '20', 10),
      minRelevance: parseFloat(process.env.MIN_RELEVANCE || '0.3'),
      embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
    },
    generation: {
      maxTokens: parseInt(process.env.MAX_TOKENS || '1000', 10),
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      topP: parseFloat(process.env.TOP_P || '0.9'),
    },
    policy: {
      enabled: process.env.POLICY_ENABLED !== 'false',
      opaEndpoint: process.env.OPA_ENDPOINT,
    },
    telemetry: {
      enabled: process.env.TELEMETRY_ENABLED !== 'false',
      serviceName: 'graphrag',
    },
  };

  const orchestrator = createGraphRAGOrchestrator(config);
  const app = createServer(orchestrator);

  const port = parseInt(process.env.PORT || '8002', 10);

  app.listen(port, () => {
    console.log(`GraphRAG service listening on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await orchestrator.close();
    process.exit(0);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
