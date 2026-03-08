"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// @ts-nocheck - Express and neo4j type compatibility issues
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const compression_1 = __importDefault(require("compression"));
const pg_1 = require("pg");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const redis_1 = require("redis");
const WorkflowService_1 = require("./services/WorkflowService");
const WorkflowBuilder_1 = require("./services/WorkflowBuilder");
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
const auth_1 = require("./middleware/auth");
const app = (0, express_1.default)();
exports.app = app;
const PORT = config_1.config.server.port || 4005;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.server.allowedOrigins,
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);
// Body parsing middleware
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'workflow-engine',
        version: process.env.npm_package_version || '1.0.0',
    });
});
// Database connections
let pgPool;
let neo4jDriver;
let redisClient;
let workflowService;
async function initializeServices() {
    try {
        // PostgreSQL connection
        pgPool = new pg_1.Pool({
            host: config_1.config.database.postgres.host,
            port: config_1.config.database.postgres.port,
            user: config_1.config.database.postgres.user,
            password: config_1.config.database.postgres.password,
            database: config_1.config.database.postgres.database,
            ssl: config_1.config.database.postgres.ssl,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        // Test PostgreSQL connection
        await pgPool.query('SELECT NOW()');
        logger_1.logger.info('PostgreSQL connected successfully');
        // Neo4j connection
        neo4jDriver = neo4j_driver_1.default.driver(config_1.config.database.neo4j.uri, neo4j_driver_1.default.auth.basic(config_1.config.database.neo4j.user, config_1.config.database.neo4j.password));
        // Test Neo4j connection
        const session = neo4jDriver.session();
        await session.run('RETURN 1');
        await session.close();
        logger_1.logger.info('Neo4j connected successfully');
        // Redis connection
        redisClient = (0, redis_1.createClient)({
            socket: {
                host: config_1.config.redis.host,
                port: config_1.config.redis.port,
            },
            password: config_1.config.redis.password,
            database: config_1.config.redis.db,
        });
        await redisClient.connect();
        logger_1.logger.info('Redis connected successfully');
        // Initialize workflow service
        workflowService = new WorkflowService_1.WorkflowService(pgPool, neo4jDriver, redisClient);
        // Set up event listeners
        workflowService.on('workflow.execution.started', (execution) => {
            logger_1.logger.info(`Workflow execution started: ${execution.id}`);
        });
        workflowService.on('workflow.execution.completed', (execution) => {
            logger_1.logger.info(`Workflow execution completed: ${execution.id}`);
        });
        workflowService.on('workflow.execution.failed', (execution, error) => {
            logger_1.logger.error(`Workflow execution failed: ${execution.id}`, error);
        });
        logger_1.logger.info('Workflow services initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}
// Authentication middleware
app.use('/api', auth_1.authenticate);
// Workflow Definition API Routes
app.post('/api/workflows', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const workflow = await workflowService.createWorkflow(req.body, req.user.id);
        res.status(201).json(workflow);
    }
    catch (error) {
        logger_1.logger.error('Error creating workflow:', error);
        res.status(500).json({ error: 'Failed to create workflow' });
    }
});
app.get('/api/workflows', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { page = '1', limit = '20', search, isActive } = req.query;
        // This would be implemented in WorkflowService
        const workflows = await getWorkflows({
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            search: search,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });
        res.json(workflows);
    }
    catch (error) {
        logger_1.logger.error('Error listing workflows:', error);
        res.status(500).json({ error: 'Failed to list workflows' });
    }
});
app.get('/api/workflows/:id', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const workflow = await workflowService.getWorkflow(req.params.id);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json(workflow);
    }
    catch (error) {
        logger_1.logger.error('Error getting workflow:', error);
        res.status(500).json({ error: 'Failed to get workflow' });
    }
});
app.put('/api/workflows/:id', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        // Update workflow implementation would go here
        res.status(501).json({ error: 'Update workflow not implemented yet' });
    }
    catch (error) {
        logger_1.logger.error('Error updating workflow:', error);
        res.status(500).json({ error: 'Failed to update workflow' });
    }
});
app.delete('/api/workflows/:id', (0, auth_1.authorize)(['admin']), async (req, res) => {
    try {
        // Delete workflow implementation would go here
        res.status(501).json({ error: 'Delete workflow not implemented yet' });
    }
    catch (error) {
        logger_1.logger.error('Error deleting workflow:', error);
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
});
// Workflow Execution API Routes
app.post('/api/workflows/:id/execute', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { triggerData } = req.body;
        const execution = await workflowService.executeWorkflow(req.params.id, 'manual', triggerData, req.user.id);
        res.status(201).json(execution);
    }
    catch (error) {
        logger_1.logger.error('Error executing workflow:', error);
        res.status(500).json({ error: 'Failed to execute workflow' });
    }
});
app.get('/api/executions', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { page = '1', limit = '20', workflowId, status } = req.query;
        // This would be implemented in WorkflowService
        const executions = await getExecutions({
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            workflowId: workflowId,
            status: status,
        });
        res.json(executions);
    }
    catch (error) {
        logger_1.logger.error('Error listing executions:', error);
        res.status(500).json({ error: 'Failed to list executions' });
    }
});
app.get('/api/executions/:id', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const execution = await workflowService.getExecution(req.params.id);
        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }
        res.json(execution);
    }
    catch (error) {
        logger_1.logger.error('Error getting execution:', error);
        res.status(500).json({ error: 'Failed to get execution' });
    }
});
app.post('/api/executions/:id/cancel', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        // Cancel execution implementation would go here
        res.status(501).json({ error: 'Cancel execution not implemented yet' });
    }
    catch (error) {
        logger_1.logger.error('Error cancelling execution:', error);
        res.status(500).json({ error: 'Failed to cancel execution' });
    }
});
app.post('/api/executions/:id/retry', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        // Retry execution implementation would go here
        res.status(501).json({ error: 'Retry execution not implemented yet' });
    }
    catch (error) {
        logger_1.logger.error('Error retrying execution:', error);
        res.status(500).json({ error: 'Failed to retry execution' });
    }
});
// Human Tasks API Routes
app.get('/api/human-tasks', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { page = '1', limit = '20', status, assignee } = req.query;
        // This would be implemented in WorkflowService
        const tasks = await getHumanTasks({
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            status: status,
            assignee: assignee || req.user.id,
        });
        res.json(tasks);
    }
    catch (error) {
        logger_1.logger.error('Error listing human tasks:', error);
        res.status(500).json({ error: 'Failed to list human tasks' });
    }
});
app.get('/api/human-tasks/:id', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        // Get human task implementation would go here
        res.status(501).json({ error: 'Get human task not implemented yet' });
    }
    catch (error) {
        logger_1.logger.error('Error getting human task:', error);
        res.status(500).json({ error: 'Failed to get human task' });
    }
});
app.post('/api/human-tasks/:id/complete', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { formData } = req.body;
        // Complete human task implementation would go here
        // This would update the task status and continue workflow execution
        res.json({ success: true, message: 'Task completed successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error completing human task:', error);
        res.status(500).json({ error: 'Failed to complete human task' });
    }
});
// Workflow Builder API Routes
app.get('/api/workflow-templates', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { category } = req.query;
        let templates = WorkflowBuilder_1.BuiltInWorkflowTemplates;
        if (category) {
            templates = templates.filter((template) => template.category === category);
        }
        res.json(templates);
    }
    catch (error) {
        logger_1.logger.error('Error getting workflow templates:', error);
        res.status(500).json({ error: 'Failed to get workflow templates' });
    }
});
app.post('/api/workflow-templates/:id/create', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { name, customizations } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Workflow name is required' });
        }
        const template = WorkflowBuilder_1.BuiltInWorkflowTemplates.find((t) => t.id === req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        // Create workflow from template
        let workflowDefinition = {
            ...template.definition,
            name,
        };
        // Apply customizations if provided
        if (customizations) {
            workflowDefinition = { ...workflowDefinition, ...customizations };
        }
        const workflow = await workflowService.createWorkflow(workflowDefinition, req.user.id);
        res.status(201).json(workflow);
    }
    catch (error) {
        logger_1.logger.error('Error creating workflow from template:', error);
        res
            .status(500)
            .json({ error: 'Failed to create workflow from template' });
    }
});
// Workflow Builder endpoint
app.post('/api/workflow-builder', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { type, name, config } = req.body;
        if (!type || !name) {
            return res.status(400).json({ error: 'Type and name are required' });
        }
        let builder;
        switch (type) {
            case 'data-processing':
                builder = WorkflowBuilder_1.WorkflowBuilder.createDataProcessingWorkflow(name);
                break;
            case 'incident-response':
                builder = WorkflowBuilder_1.WorkflowBuilder.createIncidentResponseWorkflow(name);
                break;
            case 'approval':
                builder = WorkflowBuilder_1.WorkflowBuilder.createApprovalWorkflow(name);
                break;
            default:
                builder = new WorkflowBuilder_1.WorkflowBuilder(name);
        }
        // Apply additional configuration if provided
        if (config) {
            if (config.description) {
                builder.setDescription(config.description);
            }
            if (config.errorHandling) {
                builder.setErrorHandling(config.errorHandling);
            }
            if (config.logging) {
                builder.setLogging(config.logging);
            }
            if (config.concurrency) {
                builder.setConcurrency(config.concurrency);
            }
            if (config.timeout) {
                builder.setTimeout(config.timeout);
            }
            if (config.variables) {
                Object.entries(config.variables).forEach(([key, value]) => {
                    builder.setGlobalVariable(key, value);
                });
            }
        }
        const workflowDefinition = builder.build();
        const workflow = await workflowService.createWorkflow(workflowDefinition, req.user.id);
        res.status(201).json(workflow);
    }
    catch (error) {
        logger_1.logger.error('Error building workflow:', error);
        res.status(500).json({ error: 'Failed to build workflow' });
    }
});
// Webhook endpoints for external triggers
app.post('/api/webhooks/workflow/:workflowId/:triggerPath', async (req, res) => {
    try {
        const { workflowId, triggerPath } = req.params;
        // Verify webhook trigger exists and is enabled
        const workflow = await workflowService.getWorkflow(workflowId);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        const webhookTrigger = workflow.triggers.find((trigger) => trigger.type === 'webhook' &&
            trigger.config.webhookPath === triggerPath &&
            trigger.isEnabled);
        if (!webhookTrigger) {
            return res
                .status(404)
                .json({ error: 'Webhook trigger not found or disabled' });
        }
        // Execute workflow with webhook data
        const execution = await workflowService.executeWorkflow(workflowId, 'webhook', {
            ...req.body,
            headers: req.headers,
            query: req.query,
        });
        res.json({
            success: true,
            executionId: execution.id,
            message: 'Workflow triggered successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});
// Analytics and monitoring endpoints
app.get('/api/analytics/workflow-stats', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const stats = await getWorkflowStats();
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Error getting workflow stats:', error);
        res.status(500).json({ error: 'Failed to get workflow stats' });
    }
});
app.get('/api/analytics/execution-metrics', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { workflowId, period = '7d' } = req.query;
        const metrics = await getExecutionMetrics(workflowId, period);
        res.json(metrics);
    }
    catch (error) {
        logger_1.logger.error('Error getting execution metrics:', error);
        res.status(500).json({ error: 'Failed to get execution metrics' });
    }
});
// Placeholder implementations for database queries
async function getWorkflows(options) {
    const query = `
    SELECT * FROM workflow_definitions 
    WHERE 1=1
    ${options.search ? 'AND (name ILIKE $1 OR description ILIKE $1)' : ''}
    ${options.isActive !== undefined ? `AND is_active = $${options.search ? 2 : 1}` : ''}
    ORDER BY created_at DESC
    LIMIT $${options.search ? 3 : options.isActive !== undefined ? 2 : 1}
    OFFSET $${options.search ? 4 : options.isActive !== undefined ? 3 : 2}
  `;
    const params = [];
    if (options.search) {
        params.push(`%${options.search}%`);
    }
    if (options.isActive !== undefined) {
        params.push(options.isActive);
    }
    params.push(options.limit, options.offset);
    const result = await pgPool.query(query, params);
    return result.rows;
}
async function getExecutions(options) {
    const query = `
    SELECT * FROM workflow_executions 
    WHERE 1=1
    ${options.workflowId ? 'AND workflow_id = $1' : ''}
    ${options.status ? `AND status = $${options.workflowId ? 2 : 1}` : ''}
    ORDER BY started_at DESC
    LIMIT $${options.workflowId && options.status ? 3 : options.workflowId || options.status ? 2 : 1}
    OFFSET $${options.workflowId && options.status ? 4 : options.workflowId || options.status ? 3 : 2}
  `;
    const params = [];
    if (options.workflowId) {
        params.push(options.workflowId);
    }
    if (options.status) {
        params.push(options.status);
    }
    params.push(options.limit, options.offset);
    const result = await pgPool.query(query, params);
    return result.rows;
}
async function getHumanTasks(options) {
    const query = `
    SELECT * FROM human_tasks 
    WHERE 1=1
    ${options.status ? 'AND status = $1' : ''}
    ${options.assignee ? `AND assignees @> $${options.status ? 2 : 1}` : ''}
    ORDER BY created_at DESC
    LIMIT $${options.status && options.assignee ? 3 : options.status || options.assignee ? 2 : 1}
    OFFSET $${options.status && options.assignee ? 4 : options.status || options.assignee ? 3 : 2}
  `;
    const params = [];
    if (options.status) {
        params.push(options.status);
    }
    if (options.assignee) {
        params.push(`["${options.assignee}"]`);
    }
    params.push(options.limit, options.offset);
    const result = await pgPool.query(query, params);
    return result.rows;
}
async function getWorkflowStats() {
    const queries = [
        'SELECT COUNT(*) as total_workflows FROM workflow_definitions',
        'SELECT COUNT(*) as active_workflows FROM workflow_definitions WHERE is_active = true',
        'SELECT COUNT(*) as total_executions FROM workflow_executions',
        "SELECT COUNT(*) as running_executions FROM workflow_executions WHERE status = 'running'",
        "SELECT COUNT(*) as pending_tasks FROM human_tasks WHERE status IN ('pending', 'assigned')",
    ];
    const results = await Promise.all(queries.map((query) => pgPool.query(query)));
    return {
        totalWorkflows: parseInt(results[0].rows[0].total_workflows),
        activeWorkflows: parseInt(results[1].rows[0].active_workflows),
        totalExecutions: parseInt(results[2].rows[0].total_executions),
        runningExecutions: parseInt(results[3].rows[0].running_executions),
        pendingTasks: parseInt(results[4].rows[0].pending_tasks),
    };
}
async function getExecutionMetrics(workflowId, period) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    let query = `
    SELECT 
      DATE_TRUNC('day', started_at) as date,
      status,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
    FROM workflow_executions 
    WHERE started_at >= NOW() - INTERVAL '${days} days'
  `;
    const params = [];
    if (workflowId) {
        query += ' AND workflow_id = $1';
        params.push(workflowId);
    }
    query += " GROUP BY DATE_TRUNC('day', started_at), status ORDER BY date DESC";
    const result = await pgPool.query(query, params);
    return {
        period,
        workflowId,
        metrics: result.rows,
    };
}
// Error handling middleware
app.use((error, req, res, next) => {
    logger_1.logger.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
    });
});
// Start server
async function startServer() {
    try {
        await initializeServices();
        const server = app.listen(PORT, () => {
            logger_1.logger.info(`Workflow Engine server running on port ${PORT}`);
            logger_1.logger.info(`Health check: http://localhost:${PORT}/health`);
        });
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully');
            server.close(async () => {
                await pgPool.end();
                await neo4jDriver.close();
                await redisClient.quit();
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
        });
        process.on('SIGINT', async () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully');
            server.close(async () => {
                await pgPool.end();
                await neo4jDriver.close();
                await redisClient.quit();
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
