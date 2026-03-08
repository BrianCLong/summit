"use strict";
// @ts-nocheck
/**
 * Agent Gateway Server
 * Main Express server for the Agent Gateway API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaManager = exports.approvalService = exports.agentService = exports.gateway = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pg_1 = require("pg");
const AgentService_js_1 = require("./AgentService.js");
const AgentGateway_js_1 = require("./AgentGateway.js");
const PolicyEnforcer_js_1 = require("./PolicyEnforcer.js");
const QuotaManager_js_1 = require("./QuotaManager.js");
const ApprovalService_js_1 = require("./ApprovalService.js");
const ObservabilityService_js_1 = require("./ObservabilityService.js");
// ============================================================================
// Configuration
// ============================================================================
const config = {
    forceSimulationMode: process.env.FORCE_SIMULATION === 'true',
    defaultOperationMode: process.env.DEFAULT_OPERATION_MODE || 'SIMULATION',
    allowModeOverride: process.env.ALLOW_MODE_OVERRIDE !== 'false',
    globalRateLimitPerHour: parseInt(process.env.GLOBAL_RATE_LIMIT_HOUR || '10000'),
    globalRateLimitPerDay: parseInt(process.env.GLOBAL_RATE_LIMIT_DAY || '100000'),
    autoApproveBelow: process.env.AUTO_APPROVE_BELOW || 'low',
    requireApprovalAbove: process.env.REQUIRE_APPROVAL_ABOVE || 'medium',
    defaultApprovalExpiryMinutes: parseInt(process.env.APPROVAL_EXPIRY_MINUTES || '60'),
    defaultApprovalAssignees: process.env.APPROVAL_ASSIGNEES?.split(',') || [],
    enableDetailedLogging: process.env.ENABLE_DETAILED_LOGGING !== 'false',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableTracing: process.env.ENABLE_TRACING !== 'false',
    enableSafetyChecks: process.env.ENABLE_SAFETY_CHECKS !== 'false',
    enableCrossTenantBlocking: process.env.ENABLE_CROSS_TENANT_BLOCKING !== 'false',
    enableQuotaEnforcement: process.env.ENABLE_QUOTA_ENFORCEMENT !== 'false',
};
// ============================================================================
// Database Connection
// ============================================================================
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'summit',
    user: process.env.DB_USER || 'summit',
    password: process.env.DB_PASSWORD || 'summit',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// ============================================================================
// Services
// ============================================================================
const agentService = new AgentService_js_1.AgentService(pool);
exports.agentService = agentService;
const policyEnforcer = new PolicyEnforcer_js_1.PolicyEnforcer(process.env.OPA_ENDPOINT || 'http://localhost:8181', process.env.OPA_DRY_RUN === 'true');
const quotaManager = new QuotaManager_js_1.QuotaManager(pool);
exports.quotaManager = quotaManager;
const approvalService = new ApprovalService_js_1.ApprovalService(pool);
exports.approvalService = approvalService;
const observability = new ObservabilityService_js_1.ObservabilityService(config.enableMetrics, config.enableTracing);
const gateway = new AgentGateway_js_1.AgentGateway(pool, agentService, policyEnforcer, quotaManager, approvalService, observability, config);
exports.gateway = gateway;
// ============================================================================
// Express App
// ============================================================================
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        }));
    });
    next();
});
// ============================================================================
// Auth Middleware
// ============================================================================
async function authenticateAgent(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }
        const token = authHeader.substring(7);
        const agent = await agentService.authenticateAgent(token);
        if (!agent) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Store agent in request context
        req.agent = agent;
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
}
// ============================================================================
// Health & Status
// ============================================================================
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.get('/config', (req, res) => {
    res.json({
        ...config,
        // Don't expose sensitive config
        defaultApprovalAssignees: '<redacted>',
    });
});
// ============================================================================
// Agent Management API (Admin only - would add admin auth in production)
// ============================================================================
// Create agent
app.post('/api/admin/agents', async (req, res) => {
    try {
        const agent = await agentService.createAgent(req.body, req.body.actorId);
        res.status(201).json(agent);
    }
    catch (error) {
        console.error('Create agent error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Get agent
app.get('/api/admin/agents/:id', async (req, res) => {
    try {
        const agent = await agentService.getAgent(req.params.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        res.json(agent);
    }
    catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({ error: error.message });
    }
});
// List agents
app.get('/api/admin/agents', async (req, res) => {
    try {
        const agents = await agentService.listAgents(req.query);
        res.json(agents);
    }
    catch (error) {
        console.error('List agents error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Update agent
app.patch('/api/admin/agents/:id', async (req, res) => {
    try {
        const agent = await agentService.updateAgent(req.params.id, req.body, req.body.actorId);
        res.json(agent);
    }
    catch (error) {
        console.error('Update agent error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Delete agent
app.delete('/api/admin/agents/:id', async (req, res) => {
    try {
        await agentService.deleteAgent(req.params.id, req.body.actorId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete agent error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Certify agent
app.post('/api/admin/agents/:id/certify', async (req, res) => {
    try {
        const agent = await agentService.certifyAgent(req.params.id, req.body.expiresInDays, req.body.actorId);
        res.json(agent);
    }
    catch (error) {
        console.error('Certify agent error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Create credential
app.post('/api/admin/agents/:id/credentials', async (req, res) => {
    try {
        const result = await agentService.createCredential(req.params.id, req.body.credentialType, req.body.options, req.body.actorId);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Create credential error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Rotate credential
app.post('/api/admin/credentials/:id/rotate', async (req, res) => {
    try {
        const result = await agentService.rotateCredential(req.params.id, req.body.actorId);
        res.json(result);
    }
    catch (error) {
        console.error('Rotate credential error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Revoke credential
app.delete('/api/admin/credentials/:id', async (req, res) => {
    try {
        await agentService.revokeCredential(req.params.id, req.body.reason, req.body.actorId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Revoke credential error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// Agent Gateway API (Agent authentication required)
// ============================================================================
// Execute request - Main gateway endpoint
app.post('/api/agent/execute', authenticateAgent, async (req, res) => {
    try {
        const agent = req.agent;
        const authToken = req.headers.authorization.substring(7);
        const request = {
            agentId: agent.id,
            tenantId: req.body.tenantId,
            projectId: req.body.projectId,
            operationMode: req.body.operationMode,
            action: req.body.action,
            metadata: req.body.metadata,
        };
        const response = await gateway.executeRequest(request, authToken);
        res.json(response);
    }
    catch (error) {
        console.error('Execute request error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'GATEWAY_ERROR',
                message: error.message,
            },
        });
    }
});
// Get agent info (self)
app.get('/api/agent/me', authenticateAgent, (req, res) => {
    const agent = req.agent;
    res.json(agent);
});
// Get quota status
app.get('/api/agent/quotas', authenticateAgent, async (req, res) => {
    try {
        const agent = req.agent;
        const quotas = await quotaManager.getQuotaStatus(agent.id);
        res.json(quotas);
    }
    catch (error) {
        console.error('Get quotas error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// Approval API
// ============================================================================
// List pending approvals
app.get('/api/approvals/pending', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId query parameter required' });
        }
        const approvals = await approvalService.listPendingApprovals(userId);
        res.json(approvals);
    }
    catch (error) {
        console.error('List approvals error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Make approval decision
app.post('/api/approvals/:id/decide', async (req, res) => {
    try {
        const decision = {
            approvalId: req.params.id,
            decision: req.body.decision,
            reason: req.body.reason,
            userId: req.body.userId,
        };
        const approval = await approvalService.processDecision(decision);
        res.json(approval);
    }
    catch (error) {
        console.error('Process decision error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Get approval details
app.get('/api/approvals/:id', async (req, res) => {
    try {
        const approval = await approvalService.getApproval(req.params.id);
        if (!approval) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        res.json(approval);
    }
    catch (error) {
        console.error('Get approval error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// Error Handling
// ============================================================================
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});
// ============================================================================
// Start Server
// ============================================================================
const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, () => {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        message: 'Agent Gateway server started',
        port: PORT,
        config: {
            ...config,
            defaultApprovalAssignees: '<redacted>',
        },
    }));
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await pool.end();
    process.exit(0);
});
