"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginHostAPI = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const plugin_system_1 = require("@intelgraph/plugin-system");
/**
 * REST API for Plugin Host Service
 */
class PluginHostAPI {
    app;
    service;
    logger;
    constructor(service, logger) {
        this.app = (0, express_1.default)();
        this.service = service;
        this.logger = logger;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    /**
     * Setup middleware
     */
    setupMiddleware() {
        // Security
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)({
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true,
        }));
        // Rate limiting
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
        });
        this.app.use('/api/plugins', limiter);
        // Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Request logging
        this.app.use((req, _res, next) => {
            this.logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            next();
        });
    }
    /**
     * Setup API routes
     */
    setupRoutes() {
        const router = express_1.default.Router();
        // Health check
        router.get('/health', async (_req, res) => {
            try {
                const health = await this.service.getServiceHealth();
                res.status(health.healthy ? 200 : 503).json(health);
            }
            catch (error) {
                res.status(500).json({ error: 'Health check failed' });
            }
        });
        // List plugins
        router.get('/plugins', async (req, res) => {
            try {
                const filter = {
                    category: req.query.category,
                    state: req.query.state,
                    author: req.query.author,
                };
                const plugins = await this.service.listPlugins(filter);
                res.json({ plugins, total: plugins.length });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Get plugin details
        router.get('/plugins/:id', async (req, res) => {
            try {
                const plugin = await this.service.getPlugin(req.params.id);
                if (!plugin) {
                    res.status(404).json({ error: 'Plugin not found' });
                    return;
                }
                res.json(plugin);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Install plugin
        router.post('/plugins', async (req, res) => {
            try {
                // Validate manifest
                const manifest = plugin_system_1.PluginManifestSchema.parse(req.body.manifest);
                const source = req.body.source;
                if (!source || !source.type) {
                    res.status(400).json({ error: 'Source information required' });
                    return;
                }
                const options = {
                    userId: req.body.userId,
                    tenantId: req.body.tenantId,
                    forceInstall: req.body.forceInstall === true,
                };
                await this.service.installPlugin(manifest, source, options);
                res.status(201).json({ message: 'Plugin installed successfully', pluginId: manifest.id });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Uninstall plugin
        router.delete('/plugins/:id', async (req, res) => {
            try {
                await this.service.uninstallPlugin(req.params.id);
                res.json({ message: 'Plugin uninstalled successfully' });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Enable plugin
        router.post('/plugins/:id/enable', async (req, res) => {
            try {
                const options = {
                    userId: req.body.userId,
                    tenantId: req.body.tenantId,
                };
                await this.service.enablePlugin(req.params.id, options);
                res.json({ message: 'Plugin enabled successfully' });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Disable plugin
        router.post('/plugins/:id/disable', async (req, res) => {
            try {
                await this.service.disablePlugin(req.params.id);
                res.json({ message: 'Plugin disabled successfully' });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Reload plugin
        router.post('/plugins/:id/reload', async (req, res) => {
            try {
                await this.service.reloadPlugin(req.params.id);
                res.json({ message: 'Plugin reloaded successfully' });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Update plugin
        router.put('/plugins/:id', async (req, res) => {
            try {
                const newVersion = req.body.version;
                if (!newVersion) {
                    res.status(400).json({ error: 'Version required' });
                    return;
                }
                await this.service.updatePlugin(req.params.id, newVersion);
                res.json({ message: 'Plugin updated successfully' });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Get plugin health
        router.get('/plugins/:id/health', async (req, res) => {
            try {
                const health = await this.service.getPluginHealth(req.params.id);
                res.status(health.healthy ? 200 : 503).json(health);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.app.use('/api', router);
    }
    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // 404 handler
        this.app.use((_req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
        // Error handler
        this.app.use((error, _req, res, _next) => {
            this.logger.error('Unhandled error', { error: error.message, stack: error.stack });
            res.status(500).json({ error: 'Internal server error' });
        });
    }
    /**
     * Handle errors consistently
     */
    handleError(error, res) {
        this.logger.error('API error', { error });
        if (error instanceof Error) {
            // Check for validation errors
            if (error.name === 'ZodError') {
                res.status(400).json({ error: 'Validation error', details: error.message });
                return;
            }
            res.status(500).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Unknown error occurred' });
        }
    }
    /**
     * Start the API server
     */
    async start(port) {
        return new Promise((resolve) => {
            this.app.listen(port, () => {
                this.logger.info(`Plugin Host API listening on port ${port}`);
                resolve();
            });
        });
    }
    /**
     * Get Express app instance
     */
    getApp() {
        return this.app;
    }
}
exports.PluginHostAPI = PluginHostAPI;
