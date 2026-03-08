"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSummitAPI = createSummitAPI;
const express_1 = __importDefault(require("express"));
const rest_api_1 = require("@intelgraph/rest-api");
const streaming_api_1 = require("@intelgraph/streaming-api");
const query_language_1 = require("@intelgraph/query-language");
/**
 * Create a unified Summit API instance
 */
function createSummitAPI(config) {
    // Create REST API
    const restConfig = {
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
    const rest = (0, rest_api_1.createAPI)(restConfig);
    const app = rest.app;
    // Initialize WebSocket streaming if enabled
    let websocket;
    if (config.streaming?.websocket?.enabled !== false) {
        websocket = new streaming_api_1.StreamingWebSocketServer({
            server: app,
            path: config.streaming?.websocket?.path || '/ws',
        });
    }
    // Initialize SSE streaming if enabled
    let sse;
    if (config.streaming?.sse?.enabled) {
        sse = new streaming_api_1.SSEServer();
        const ssePath = config.streaming.sse.path || '/stream';
        app.get(ssePath, (req, res) => {
            const topics = req.query.topics
                ? req.query.topics.split(',')
                : undefined;
            sse.handleConnection(req, res, { topics });
        });
    }
    // Initialize query language endpoint if enabled
    let queryLanguage;
    if (config.queryLanguage?.enabled) {
        queryLanguage = new query_language_1.SummitQL({
            optimize: true,
            validate: true,
        });
        const endpoint = config.queryLanguage.endpoint || '/query';
        app.post(endpoint, express_1.default.json(), async (req, res, next) => {
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
                    for await (const result of queryLanguage.stream(query)) {
                        res.write(JSON.stringify(result) + '\n');
                    }
                    res.end();
                }
                else {
                    // Regular query
                    const result = await queryLanguage.execute(query, { cache });
                    res.json(result);
                }
            }
            catch (error) {
                next(error);
            }
        });
        // Query validation endpoint
        app.post(`${endpoint}/validate`, express_1.default.json(), (req, res) => {
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
                const validation = queryLanguage.validate(query);
                res.json({
                    success: validation.valid,
                    data: validation,
                });
            }
            catch (error) {
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
        app.post(`${endpoint}/explain`, express_1.default.json(), (req, res, next) => {
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
                const explanation = queryLanguage.explain(query);
                res.json({
                    success: true,
                    data: { explanation },
                });
            }
            catch (error) {
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
        start(port) {
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
__exportStar(require("@intelgraph/rest-api"), exports);
__exportStar(require("@intelgraph/streaming-api"), exports);
__exportStar(require("@intelgraph/query-language"), exports);
