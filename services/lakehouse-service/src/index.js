"use strict";
/**
 * Lakehouse Service
 * REST API for lakehouse data operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const lakehouse_1 = require("@intelgraph/lakehouse");
const unified_analytics_1 = require("@intelgraph/unified-analytics");
const cloud_governance_1 = require("@intelgraph/cloud-governance");
const logger = (0, pino_1.default)({ name: 'lakehouse-service' });
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, pino_http_1.default)({ logger }));
// Initialize managers
const lakehouseManager = new lakehouse_1.LakehouseManager();
const analyticsEngine = new unified_analytics_1.UnifiedAnalyticsEngine({
    enableAdaptiveExecution: true,
    enableCaching: true,
    maxConcurrency: 10,
    queryTimeout: 300000
});
const governanceManager = new cloud_governance_1.GovernanceManager();
// Routes
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'lakehouse' });
});
// Create table
app.post('/api/tables', async (req, res) => {
    try {
        const config = req.body;
        const table = await lakehouseManager.createTable(config);
        res.status(201).json({
            message: 'Table created successfully',
            table: table.getMetadata()
        });
    }
    catch (error) {
        logger.error({ error }, 'Failed to create table');
        res.status(500).json({ error: error.message });
    }
});
// List tables
app.get('/api/tables', async (req, res) => {
    try {
        const tables = await lakehouseManager.listTables();
        res.json({ tables });
    }
    catch (error) {
        logger.error({ error }, 'Failed to list tables');
        res.status(500).json({ error: error.message });
    }
});
// Get table metadata
app.get('/api/tables/:name', async (req, res) => {
    try {
        const metadata = await lakehouseManager.getTableMetadata(req.params.name);
        res.json({ metadata });
    }
    catch (error) {
        logger.error({ error, table: req.params.name }, 'Failed to get table metadata');
        res.status(404).json({ error: error.message });
    }
});
// Execute query
app.post('/api/query', async (req, res) => {
    try {
        const { query, principal } = req.body;
        // Check access
        const hasAccess = await governanceManager.checkAccess(principal, '*', 'read');
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const result = await analyticsEngine.executeSQL(query);
        res.json({ result });
    }
    catch (error) {
        logger.error({ error }, 'Query execution failed');
        res.status(500).json({ error: error.message });
    }
});
// Get table snapshots
app.get('/api/tables/:name/snapshots', async (req, res) => {
    try {
        const table = lakehouseManager.getTable(req.params.name);
        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }
        const snapshots = await table.listSnapshots();
        res.json({ snapshots });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get snapshots');
        res.status(500).json({ error: error.message });
    }
});
// Time travel query
app.post('/api/tables/:name/time-travel', async (req, res) => {
    try {
        const table = lakehouseManager.getTable(req.params.name);
        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }
        const { version, timestamp, snapshotId } = req.body;
        const data = await table.readAtVersion({ version, timestamp, snapshotId });
        res.json({ data });
    }
    catch (error) {
        logger.error({ error }, 'Time travel query failed');
        res.status(500).json({ error: error.message });
    }
});
// Optimize table
app.post('/api/tables/:name/optimize', async (req, res) => {
    try {
        const table = lakehouseManager.getTable(req.params.name);
        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }
        const result = await table.optimize();
        res.json({ result });
    }
    catch (error) {
        logger.error({ error }, 'Optimization failed');
        res.status(500).json({ error: error.message });
    }
});
// Governance endpoints
app.post('/api/governance/policies', async (req, res) => {
    try {
        const policy = await governanceManager.createPolicy(req.body);
        res.status(201).json({ policy });
    }
    catch (error) {
        logger.error({ error }, 'Failed to create policy');
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/governance/audit-logs', async (req, res) => {
    try {
        const logs = await governanceManager.getAuditLogs(req.query);
        res.json({ logs });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get audit logs');
        res.status(500).json({ error: error.message });
    }
});
// Start server
const PORT = process.env.PORT || 4200;
app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Lakehouse service started');
});
exports.default = app;
