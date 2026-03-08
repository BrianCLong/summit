"use strict";
/**
 * REST API for Agent Execution Platform
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_js_1 = require("../runner/index.js");
const index_js_2 = require("../pipeline/index.js");
const index_js_3 = require("../registry/index.js");
const index_js_4 = require("../logging/index.js");
const index_js_5 = require("../config/index.js");
class APIServer {
    app;
    port;
    constructor(port = 4000) {
        this.app = (0, express_1.default)();
        this.port = port;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        // Security
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)({
            origin: index_js_5.configManager.get().server.cors.origins,
            credentials: true,
        }));
        // Rate limiting
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: index_js_5.configManager.get().server.rateLimit.windowMs,
            max: index_js_5.configManager.get().server.rateLimit.maxRequests,
            message: 'Too many requests from this IP',
        });
        this.app.use('/api/', limiter);
        // Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // Request logging
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            res.on('finish', () => {
                index_js_4.logger.getLogger().info('HTTP Request', {
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    durationMs: Date.now() - startTime,
                });
            });
            next();
        });
    }
    setupRoutes() {
        const router = express_1.default.Router();
        // Health check
        router.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date(),
                version: '1.0.0',
            });
        });
        // Agent execution endpoints
        router.post('/agents/execute', this.executeAgent.bind(this));
        router.get('/agents/executions', this.listExecutions.bind(this));
        router.get('/agents/executions/:id', this.getExecution.bind(this));
        router.delete('/agents/executions/:id', this.cancelExecution.bind(this));
        router.get('/agents/stats', this.getAgentStats.bind(this));
        // Pipeline endpoints
        router.post('/pipelines/execute', this.executePipeline.bind(this));
        router.get('/pipelines/executions', this.listPipelineExecutions.bind(this));
        router.get('/pipelines/executions/:id', this.getPipelineExecution.bind(this));
        router.delete('/pipelines/executions/:id', this.cancelPipelineExecution.bind(this));
        // Prompt registry endpoints
        router.post('/prompts', this.registerPrompt.bind(this));
        router.get('/prompts', this.listPrompts.bind(this));
        router.get('/prompts/:name', this.getPrompt.bind(this));
        router.post('/prompts/:name/render', this.renderPrompt.bind(this));
        router.delete('/prompts/:name', this.deletePrompt.bind(this));
        router.get('/prompts/:name/versions', this.getPromptVersions.bind(this));
        router.get('/prompts/stats', this.getPromptStats.bind(this));
        // Logging endpoints
        router.get('/logs', this.queryLogs.bind(this));
        router.get('/logs/stats', this.getLogStats.bind(this));
        this.app.use('/api', router);
    }
    setupErrorHandling() {
        this.app.use((error, req, res, next) => {
            index_js_4.logger.getLogger().error('Unhandled error', error, {
                path: req.path,
                method: req.method,
            });
            const response = {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message,
                },
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.status(500).json(response);
        });
    }
    // Agent execution handlers
    async executeAgent(req, res) {
        try {
            const { config, input, context } = req.body;
            const result = await index_js_1.agentRunner.execute(config, input, context);
            const response = {
                success: result.success,
                data: result,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async listExecutions(req, res) {
        try {
            const executions = await index_js_1.agentRunner.listExecutions();
            const response = {
                success: true,
                data: executions,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getExecution(req, res) {
        try {
            const { id } = req.params;
            const execution = await index_js_1.agentRunner.getExecution(id);
            if (!execution) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Execution not found',
                    },
                });
                return;
            }
            const response = {
                success: true,
                data: execution,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async cancelExecution(req, res) {
        try {
            const { id } = req.params;
            const cancelled = await index_js_1.agentRunner.cancelExecution(id);
            const response = {
                success: cancelled,
                data: { cancelled },
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getAgentStats(req, res) {
        try {
            const stats = index_js_1.agentRunner.getStats();
            const response = {
                success: true,
                data: stats,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    // Pipeline handlers
    async executePipeline(req, res) {
        try {
            const { definition, context } = req.body;
            const execution = await index_js_2.pipelineEngine.execute(definition, context);
            const response = {
                success: true,
                data: execution,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async listPipelineExecutions(req, res) {
        try {
            const executions = await index_js_2.pipelineEngine.listExecutions();
            const response = {
                success: true,
                data: executions,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getPipelineExecution(req, res) {
        try {
            const { id } = req.params;
            const execution = await index_js_2.pipelineEngine.getExecution(id);
            if (!execution) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Pipeline execution not found',
                    },
                });
                return;
            }
            const response = {
                success: true,
                data: execution,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async cancelPipelineExecution(req, res) {
        try {
            const { id } = req.params;
            const cancelled = await index_js_2.pipelineEngine.cancelExecution(id);
            const response = {
                success: cancelled,
                data: { cancelled },
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    // Prompt registry handlers
    async registerPrompt(req, res) {
        try {
            const template = req.body;
            await index_js_3.promptRegistry.register(template);
            const response = {
                success: true,
                data: { registered: true },
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async listPrompts(req, res) {
        try {
            const { tags } = req.query;
            const tagArray = tags ? tags.split(',') : undefined;
            const prompts = await index_js_3.promptRegistry.list(tagArray);
            const response = {
                success: true,
                data: prompts,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getPrompt(req, res) {
        try {
            const { name } = req.params;
            const { version } = req.query;
            const prompt = await index_js_3.promptRegistry.get(name, version);
            if (!prompt) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Prompt not found',
                    },
                });
                return;
            }
            const response = {
                success: true,
                data: prompt,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async renderPrompt(req, res) {
        try {
            const { name } = req.params;
            const { variables, version } = req.body;
            const rendered = await index_js_3.promptRegistry.render(name, variables, version);
            const response = {
                success: true,
                data: rendered,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async deletePrompt(req, res) {
        try {
            const { name } = req.params;
            const { version } = req.query;
            const deleted = await index_js_3.promptRegistry.delete(name, version);
            const response = {
                success: deleted,
                data: { deleted },
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getPromptVersions(req, res) {
        try {
            const { name } = req.params;
            const versions = await index_js_3.promptRegistry.getVersions(name);
            const response = {
                success: true,
                data: versions,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getPromptStats(req, res) {
        try {
            const stats = index_js_3.promptRegistry.getStats();
            const response = {
                success: true,
                data: stats,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    // Logging handlers
    async queryLogs(req, res) {
        try {
            const query = req.query;
            const logs = await index_js_4.logger.getStore().query(query);
            const response = {
                success: true,
                data: logs,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    async getLogStats(req, res) {
        try {
            const stats = index_js_4.logger.getStore().getStats();
            const response = {
                success: true,
                data: stats,
                metadata: {
                    requestId: this.generateRequestId(),
                    timestamp: new Date(),
                    version: '1.0.0',
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    handleError(res, error) {
        const response = {
            success: false,
            error: {
                code: 'REQUEST_ERROR',
                message: error.message,
            },
            metadata: {
                requestId: this.generateRequestId(),
                timestamp: new Date(),
                version: '1.0.0',
            },
        };
        res.status(400).json(response);
    }
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    async start() {
        return new Promise((resolve) => {
            this.app.listen(this.port, () => {
                index_js_4.logger.getLogger().info('API server started', {
                    port: this.port,
                });
                resolve();
            });
        });
    }
    getApp() {
        return this.app;
    }
}
exports.APIServer = APIServer;
