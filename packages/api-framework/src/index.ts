/**
 * Summit API Framework
 *
 * Unified API framework providing REST, GraphQL, and streaming capabilities
 * with advanced query language support
 *
 * @example
 * ```typescript
 * import { createSummitAPI } from '@intelgraph/api-framework';
 *
 * const api = createSummitAPI({
 *   rest: {
 *     version: '1.0.0',
 *     title: 'Summit API',
 *     basePath: '/api/v1',
 *   },
 *   graphql: {
 *     path: '/graphql',
 *   },
 *   streaming: {
 *     websocket: { port: 8080 },
 *     sse: { enabled: true },
 *   },
 * });
 *
 * api.start(3000);
 * ```
 */

import express, { Express } from 'express';
import { createAPI, type APIConfig } from '@intelgraph/rest-api';
import { StreamingWebSocketServer, SSEServer } from '@intelgraph/streaming-api';
import { SummitQL } from '@intelgraph/query-language';

export interface SummitAPIConfig {
  rest?: APIConfig;
  graphql?: {
    enabled?: boolean;
    path?: string;
    playground?: boolean;
  };
  streaming?: {
    websocket?: {
      enabled?: boolean;
      port?: number;
      path?: string;
    };
    sse?: {
      enabled?: boolean;
      path?: string;
    };
  };
  queryLanguage?: {
    enabled?: boolean;
    endpoint?: string;
  };
}

export interface SummitAPI {
  app: Express;
  rest: ReturnType<typeof createAPI>;
  websocket?: StreamingWebSocketServer;
  sse?: SSEServer;
  queryLanguage?: SummitQL;
  start: (port: number) => void;
  stop: () => Promise<void>;
}

/**
 * Create a unified Summit API instance
 */
export function createSummitAPI(config: SummitAPIConfig): SummitAPI {
  // Create REST API
  const restConfig: APIConfig = {
    version: '1.0.0',
    title: 'Summit API',
    description: 'Intelligence analysis platform API',
    basePath: '/api/v1',
    ...config.rest,
    cors: {
      enabled: true,
      origin: '*',
      ...config.rest?.cors,
    },
    pagination: {
      defaultLimit: 50,
      maxLimit: 1000,
      strategy: 'cursor',
      ...config.rest?.pagination,
    },
    openapi: {
      enabled: true,
      path: '/openapi.json',
      uiPath: '/docs',
      ...config.rest?.openapi,
    },
  };

  const rest = createAPI(restConfig);
  const app = rest.app;

  // Initialize WebSocket streaming if enabled
  let websocket: StreamingWebSocketServer | undefined;
  if (config.streaming?.websocket?.enabled !== false) {
    websocket = new StreamingWebSocketServer({
      server: app,
      path: config.streaming?.websocket?.path || '/ws',
    });
  }

  // Initialize SSE streaming if enabled
  let sse: SSEServer | undefined;
  if (config.streaming?.sse?.enabled) {
    sse = new SSEServer();

    const ssePath = config.streaming.sse.path || '/stream';
    app.get(ssePath, (req, res) => {
      const topics = req.query.topics
        ? (req.query.topics as string).split(',')
        : undefined;

      sse!.handleConnection(req, res, { topics });
    });
  }

  // Initialize query language endpoint if enabled
  let queryLanguage: SummitQL | undefined;
  if (config.queryLanguage?.enabled) {
    queryLanguage = new SummitQL({
      optimize: true,
      validate: true,
    });

    const endpoint = config.queryLanguage.endpoint || '/query';
    app.post(endpoint, express.json(), async (req, res, next) => {
      try {
        const { query, cache, stream } = req.body;

        if (!query) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_QUERY',
              message: 'Query is required',
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
        }

        if (stream) {
          // Streaming query
          res.setHeader('Content-Type', 'application/x-ndjson');

          for await (const result of queryLanguage!.stream(query)) {
            res.write(JSON.stringify(result) + '\n');
          }

          res.end();
        } else {
          // Regular query
          const result = await queryLanguage!.execute(query, { cache });
          res.json(result);
        }
      } catch (error) {
        next(error);
      }
    });

    // Query validation endpoint
    app.post(`${endpoint}/validate`, express.json(), (req, res) => {
      try {
        const { query } = req.body;

        if (!query) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_QUERY',
              message: 'Query is required',
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
        }

        const validation = queryLanguage!.validate(query);
        res.json({
          success: validation.valid,
          data: validation,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
      }
    });

    // Query explain endpoint
    app.post(`${endpoint}/explain`, express.json(), (req, res, next) => {
      try {
        const { query } = req.body;

        if (!query) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_QUERY',
              message: 'Query is required',
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
        }

        const explanation = queryLanguage!.explain(query);
        res.json({
          success: true,
          data: { explanation },
        });
      } catch (error) {
        next(error);
      }
    });
  }

  return {
    app,
    rest,
    websocket,
    sse,
    queryLanguage,

    start(port: number) {
      const server = app.listen(port, () => {
        console.log('\n🚀 Summit API Framework Started\n');
        console.log(`REST API: http://localhost:${port}${restConfig.basePath}`);
        console.log(`API Docs: http://localhost:${port}${restConfig.openapi?.uiPath}`);

        if (websocket) {
          console.log(`WebSocket: ws://localhost:${port}${config.streaming?.websocket?.path || '/ws'}`);
        }

        if (sse) {
          console.log(`SSE Stream: http://localhost:${port}${config.streaming?.sse?.path || '/stream'}`);
        }

        if (queryLanguage) {
          console.log(`Query Language: http://localhost:${port}${config.queryLanguage?.endpoint || '/query'}`);
        }

        console.log('');
      });

      return server;
    },

    async stop() {
      if (websocket) {
        websocket.close();
      }

      if (sse) {
        sse.close();
      }
    },
  };
}

// Re-export sub-packages
export * from '@intelgraph/rest-api';
export * from '@intelgraph/streaming-api';
export * from '@intelgraph/query-language';
