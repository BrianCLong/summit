"use strict";
/**
 * Scenario Registry HTTP Server
 *
 * Provides REST API for managing evaluation scenarios
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.start = start;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const pino_1 = require("pino");
const pino_http_1 = __importDefault(require("pino-http"));
const client_js_1 = require("./db/client.js");
const repository_js_1 = require("./repository.js");
const mesh_eval_sdk_1 = require("@intelgraph/mesh-eval-sdk");
const crypto_1 = __importDefault(require("crypto"));
const logger = (0, pino_1.pino)({ name: 'scenario-registry' });
/**
 * Server configuration
 */
const PORT = parseInt(process.env.PORT || '3100', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
/**
 * Create Express application
 */
function createApp() {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use((0, pino_http_1.default)({
        logger,
        autoLogging: {
            ignore: (req) => req.url === '/health',
        },
    }));
    // Database and repository
    const db = (0, client_js_1.getDbClient)();
    const repo = new repository_js_1.ScenarioRepository(db);
    // Health check endpoint
    app.get('/health', async (req, res) => {
        const dbHealth = await db.healthCheck();
        res.json({
            status: dbHealth.healthy ? 'ok' : 'degraded',
            service: 'scenario-registry',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
            database: {
                healthy: dbHealth.healthy,
                latency: dbHealth.latency,
            },
        });
    });
    // Create scenario
    app.post('/scenarios', async (req, res) => {
        try {
            // Validate request body
            const validation = (0, mesh_eval_sdk_1.safeValidate)(mesh_eval_sdk_1.EvalScenarioSchema, {
                ...req.body,
                createdAt: new Date(req.body.createdAt || Date.now()),
                updatedAt: new Date(req.body.updatedAt || Date.now()),
            });
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid scenario data',
                    details: validation.error.errors,
                });
            }
            const data = validation.data;
            const scenario = {
                ...data,
                id: data.id || crypto_1.default.randomUUID(),
                version: data.version || '1.0.0',
                type: data.type || 'custom',
                name: data.name || 'Untitled Scenario',
                description: data.description || '',
                tags: data.tags || [],
                inputs: (data.inputs || []).map((input) => ({
                    type: input.type || 'text',
                    content: input.content || '',
                    metadata: input.metadata || {},
                })),
                steps: (data.steps || []).map((step) => ({
                    ...step,
                    timeout: step.timeout || 60000,
                    critical: step.critical === undefined ? true : step.critical,
                })),
                constraints: (data.constraints || []).map((constraint) => ({
                    type: constraint.type || 'policy_requirement',
                    value: constraint.value || {},
                    strict: constraint.strict === undefined ? true : constraint.strict,
                })),
                difficulty: data.difficulty || 'medium',
            };
            // Check if scenario already exists
            const existing = await repo.findById(scenario.id);
            if (existing) {
                return res.status(409).json({
                    error: 'Scenario already exists',
                    id: scenario.id,
                });
            }
            // Create scenario
            const created = await repo.create(scenario);
            res.status(201).json(created);
        }
        catch (err) {
            logger.error({ err }, 'Failed to create scenario');
            res.status(500).json({
                error: 'Internal server error',
                message: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    });
    // Get scenario by ID
    app.get('/scenarios/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const scenario = await repo.findById(id);
            if (!scenario) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    id,
                });
            }
            res.json(scenario);
        }
        catch (err) {
            logger.error({ err, scenarioId: req.params.id }, 'Failed to get scenario');
            res.status(500).json({
                error: 'Internal server error',
                message: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    });
    // List scenarios
    app.get('/scenarios', async (req, res) => {
        try {
            const { type, tags, difficulty, createdBy, limit, offset, sortBy, sortOrder, } = req.query;
            const options = {
                type: type,
                tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
                difficulty: difficulty,
                createdBy: createdBy,
                limit: limit ? parseInt(limit, 10) : undefined,
                offset: offset ? parseInt(offset, 10) : undefined,
                sortBy: sortBy,
                sortOrder: sortOrder,
            };
            const { scenarios, total } = await repo.list(options);
            res.json({
                scenarios,
                total,
                limit: options.limit || 50,
                offset: options.offset || 0,
            });
        }
        catch (err) {
            logger.error({ err }, 'Failed to list scenarios');
            res.status(500).json({
                error: 'Internal server error',
                message: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    });
    // Update scenario
    app.put('/scenarios/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // Check if scenario exists
            const existing = await repo.findById(id);
            if (!existing) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    id,
                });
            }
            // Validate updates
            const updates = req.body;
            // Update scenario
            const updated = await repo.update(id, updates);
            if (!updated) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    id,
                });
            }
            res.json(updated);
        }
        catch (err) {
            logger.error({ err, scenarioId: req.params.id }, 'Failed to update scenario');
            res.status(500).json({
                error: 'Internal server error',
                message: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    });
    // Delete scenario
    app.delete('/scenarios/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await repo.delete(id);
            if (!deleted) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    id,
                });
            }
            res.status(204).send();
        }
        catch (err) {
            logger.error({ err, scenarioId: req.params.id }, 'Failed to delete scenario');
            res.status(500).json({
                error: 'Internal server error',
                message: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    });
    // Get all tags
    app.get('/scenarios/meta/tags', async (req, res) => {
        try {
            const tags = await repo.getTags();
            res.json({ tags });
        }
        catch (err) {
            logger.error({ err }, 'Failed to get tags');
            res.status(500).json({
                error: 'Internal server error',
                message: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    });
    // Get all types
    app.get('/scenarios/meta/types', async (req, res) => {
        try {
            const types = await repo.getTypes();
            res.json({ types });
        }
        catch (err) {
            logger.error({ err }, 'Failed to get types');
            res.status(500).json({
                error: 'Internal server error',
                message: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    });
    // Error handling middleware
    app.use((err, req, res, next) => {
        logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
        res.status(500).json({
            error: 'Internal server error',
            message: NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
        });
    });
    return app;
}
/**
 * Start the server
 */
async function start() {
    try {
        const app = createApp();
        const server = app.listen(PORT, HOST, () => {
            logger.info({
                port: PORT,
                host: HOST,
                env: NODE_ENV,
            }, 'Scenario Registry server started');
        });
        // Graceful shutdown
        const shutdown = async () => {
            logger.info('Shutting down gracefully...');
            server.close(() => {
                logger.info('HTTP server closed');
            });
            await (0, client_js_1.closeDbClient)();
            process.exit(0);
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
    catch (err) {
        logger.error({ err }, 'Failed to start server');
        process.exit(1);
    }
}
// Start server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    start();
}
