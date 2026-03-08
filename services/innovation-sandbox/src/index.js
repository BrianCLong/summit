"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = exports.app = void 0;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const crypto_1 = require("crypto");
const index_js_1 = require("./types/index.js");
const SecureSandbox_js_1 = require("./sandbox/SecureSandbox.js");
const BugReproducer_js_1 = require("./repro/BugReproducer.js");
const MissionMigrator_js_1 = require("./migration/MissionMigrator.js");
const SandboxRegistry_js_1 = require("./utils/SandboxRegistry.js");
const ProvLedgerClient_js_1 = require("./integration/ProvLedgerClient.js");
const logger_js_1 = require("./utils/logger.js");
const tracing_js_1 = require("./utils/tracing.js");
const logger = (0, logger_js_1.createLogger)('InnovationSandbox');
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 3100;
// Service instances
const registry = new SandboxRegistry_js_1.SandboxRegistry();
exports.registry = registry;
const migrator = new MissionMigrator_js_1.MissionMigrator();
const provLedger = new ProvLedgerClient_js_1.ProvLedgerClient();
// In-memory sandbox instances (configs stored in Redis)
const sandboxInstances = new Map();
app.use(express_1.default.json({ limit: '10mb' }));
// Request logging middleware
app.use((req, _res, next) => {
    const requestId = (0, crypto_1.randomUUID)();
    req.headers['x-request-id'] = requestId;
    (0, tracing_js_1.addSpanAttributes)({ requestId, path: req.path, method: req.method });
    next();
});
// Health endpoints
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'innovation-sandbox' }));
app.get('/health/ready', async (_req, res) => {
    try {
        const stats = await registry.getStats();
        res.json({ ready: true, stats });
    }
    catch {
        res.status(503).json({ ready: false, error: 'Registry unavailable' });
    }
});
app.get('/health/live', (_req, res) => res.json({ live: true }));
// Metrics endpoint
app.get('/metrics', async (_req, res) => {
    const stats = await registry.getStats();
    res.set('Content-Type', 'text/plain');
    res.send(`
# HELP sandbox_active_count Number of active sandboxes
# TYPE sandbox_active_count gauge
sandbox_active_count ${stats.activeSandboxes}

# HELP sandbox_executions_total Total number of executions
# TYPE sandbox_executions_total counter
sandbox_executions_total ${stats.totalExecutions}
`);
});
/**
 * Create a new sandbox environment
 */
app.post('/api/v1/sandboxes', (0, tracing_js_1.traced)('createSandbox', async (req, res) => {
    const config = index_js_1.SandboxConfigSchema.parse({
        id: (0, crypto_1.randomUUID)(),
        createdAt: new Date(),
        ...req.body,
    });
    const sandbox = new SecureSandbox_js_1.SecureSandbox(config);
    await sandbox.initialize();
    // Store in Redis and memory
    await registry.set(config);
    sandboxInstances.set(config.id, sandbox);
    // Record in provenance ledger
    await provLedger.recordSandboxCreation(config);
    logger.info('Sandbox created', { id: config.id, isolation: config.isolationLevel });
    res.status(201).json({
        sandboxId: config.id,
        config: sandbox.getConfig(),
    });
}));
/**
 * Execute code in a sandbox
 */
app.post('/api/v1/sandboxes/:id/execute', (0, tracing_js_1.traced)('executeSandbox', async (req, res) => {
    const sandboxId = req.params.id;
    // Get or restore sandbox
    let sandbox = sandboxInstances.get(sandboxId);
    if (!sandbox) {
        const config = await registry.get(sandboxId);
        if (!config) {
            return res.status(404).json({ error: 'Sandbox not found' });
        }
        sandbox = new SecureSandbox_js_1.SecureSandbox(config);
        await sandbox.initialize();
        sandboxInstances.set(sandboxId, sandbox);
    }
    const submission = index_js_1.CodeSubmissionSchema.parse({
        sandboxId,
        ...req.body,
    });
    const result = await sandbox.execute(submission);
    // Store execution result
    await registry.storeExecution(result);
    // Record in provenance ledger
    const config = await registry.get(sandboxId);
    if (config) {
        await provLedger.recordExecution(sandboxId, result.executionId, config.tenantId, config.ownerId, (0, crypto_1.createHash)('sha256').update(submission.code).digest('hex'), (0, crypto_1.createHash)('sha256').update(JSON.stringify(submission.inputs)).digest('hex'), (0, crypto_1.createHash)('sha256').update(JSON.stringify(result.output)).digest('hex'), result.sensitiveDataFlags.length);
    }
    res.json(result);
}));
/**
 * Get sandbox status
 */
app.get('/api/v1/sandboxes/:id', async (req, res) => {
    const config = await registry.get(req.params.id);
    if (!config) {
        return res.status(404).json({ error: 'Sandbox not found' });
    }
    const executions = await registry.getExecutionHistory(req.params.id);
    res.json({
        ...config,
        recentExecutions: executions.length,
    });
});
/**
 * Get execution history
 */
app.get('/api/v1/sandboxes/:id/executions', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const executionIds = await registry.getExecutionHistory(req.params.id, limit);
    const executions = [];
    for (const execId of executionIds) {
        const exec = await registry.getExecution(req.params.id, execId);
        if (exec) {
            executions.push(exec);
        }
    }
    res.json({ executions });
});
/**
 * Extend sandbox TTL
 */
app.post('/api/v1/sandboxes/:id/extend', async (req, res) => {
    const hours = Math.min(parseInt(req.body.hours) || 1, 24);
    const success = await registry.extendTTL(req.params.id, hours * 3600);
    if (!success) {
        return res.status(404).json({ error: 'Sandbox not found' });
    }
    res.json({ extended: true, additionalHours: hours });
});
/**
 * Terminate a sandbox
 */
app.delete('/api/v1/sandboxes/:id', async (req, res) => {
    const sandbox = sandboxInstances.get(req.params.id);
    if (sandbox) {
        await sandbox.terminate();
        sandboxInstances.delete(req.params.id);
    }
    const deleted = await registry.delete(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Sandbox not found' });
    }
    logger.info('Sandbox terminated', { id: req.params.id });
    res.status(204).send();
});
/**
 * Initiate migration to mission platform
 */
app.post('/api/v1/sandboxes/:id/migrate', (0, tracing_js_1.traced)('migrateSandbox', async (req, res) => {
    const sandboxId = req.params.id;
    const config = await registry.get(sandboxId);
    if (!config) {
        return res.status(404).json({ error: 'Sandbox not found' });
    }
    const migrationConfig = index_js_1.MigrationConfigSchema.parse({
        sandboxId,
        ...req.body,
    });
    // Get execution history for compliance checks
    const executionIds = await registry.getExecutionHistory(sandboxId, 50);
    const executions = [];
    for (const execId of executionIds) {
        const exec = await registry.getExecution(sandboxId, execId);
        if (exec) {
            executions.push(exec);
        }
    }
    const status = await migrator.initiateMigration(config, executions, migrationConfig);
    // Record migration start
    await provLedger.recordMigrationStart(status, config, migrationConfig.targetPlatform, migrationConfig.targetEnvironment);
    res.status(202).json(status);
}));
/**
 * Get migration status
 */
app.get('/api/v1/migrations/:id', (req, res) => {
    const status = migrator.getStatus(req.params.id);
    if (!status) {
        return res.status(404).json({ error: 'Migration not found' });
    }
    res.json(status);
});
/**
 * List migrations for a sandbox
 */
app.get('/api/v1/sandboxes/:id/migrations', (req, res) => {
    const migrations = migrator.listMigrations(req.params.id);
    res.json({ migrations });
});
/**
 * Get provenance history for a sandbox
 */
app.get('/api/v1/sandboxes/:id/provenance', async (req, res) => {
    const history = await provLedger.getHistory(req.params.id);
    const verification = await provLedger.verifyChain(req.params.id);
    res.json({
        records: history,
        verification,
    });
});
/**
 * List sandboxes for tenant
 */
app.get('/api/v1/tenants/:tenantId/sandboxes', async (req, res) => {
    const sandboxIds = await registry.listByTenant(req.params.tenantId);
    const sandboxes = [];
    for (const id of sandboxIds) {
        const config = await registry.get(id);
        if (config) {
            sandboxes.push({
                id: config.id,
                name: config.name,
                isolationLevel: config.isolationLevel,
                dataClassification: config.dataClassification,
                createdAt: config.createdAt,
                expiresAt: config.expiresAt,
            });
        }
    }
    res.json({ sandboxes });
});
/**
 * List sandbox templates
 */
app.get('/api/v1/templates', (_req, res) => {
    res.json([
        {
            name: 'Standard Development',
            isolationLevel: index_js_1.IsolationLevel.STANDARD,
            description: 'Basic isolation for development and testing',
            quotas: { cpuMs: 10000, memoryMb: 256, wallClockMs: 60000, maxOutputBytes: 5242880 },
        },
        {
            name: 'Enhanced Security',
            isolationLevel: index_js_1.IsolationLevel.ENHANCED,
            description: 'Enhanced isolation with strict resource limits',
            quotas: { cpuMs: 5000, memoryMb: 128, wallClockMs: 30000, maxOutputBytes: 1048576 },
        },
        {
            name: 'Airgapped',
            isolationLevel: index_js_1.IsolationLevel.AIRGAPPED,
            description: 'No network access, read-only filesystem',
            quotas: { cpuMs: 5000, memoryMb: 128, wallClockMs: 30000, maxOutputBytes: 1048576, maxNetworkBytes: 0 },
        },
        {
            name: 'Mission Ready',
            isolationLevel: index_js_1.IsolationLevel.MISSION_READY,
            description: 'Full compliance checks for mission deployment',
            quotas: { cpuMs: 10000, memoryMb: 256, wallClockMs: 60000, maxOutputBytes: 2097152 },
        },
    ]);
});
/**
 * Reproduce a bug from an issue description
 */
app.post('/api/v1/bugs/reproduce', (0, tracing_js_1.traced)('reproduceBug', async (req, res) => {
    const { issueText, sandboxConfig } = req.body;
    if (!issueText) {
        return res.status(400).json({ error: 'issueText is required' });
    }
    const reproducer = new BugReproducer_js_1.BugReproducer(sandboxConfig);
    const result = await reproducer.reproduce(issueText);
    res.json(result);
}));
// Error handler
app.use((err, _req, res, _next) => {
    logger.error('Request error', { error: err.message, stack: err.stack });
    if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: err });
    }
    res.status(500).json({ error: 'Internal server error' });
});
// Graceful shutdown
async function shutdown() {
    logger.info('Shutting down...');
    // Terminate all sandboxes
    for (const [id, sandbox] of sandboxInstances) {
        await sandbox.terminate();
        logger.debug('Terminated sandbox', { id });
    }
    await registry.disconnect();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Startup
async function start() {
    try {
        await registry.connect();
        app.listen(PORT, () => {
            logger.info(`Innovation Sandbox service listening on port ${PORT}`);
        });
    }
    catch (error) {
        logger.error('Failed to start', { error });
        process.exit(1);
    }
}
start();
