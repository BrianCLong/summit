"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PipelineOrchestrator_js_1 = require("../ingestion/PipelineOrchestrator.js");
const RetrievalService_js_1 = require("../services/RetrievalService.js");
const rag_js_1 = require("../services/rag.js");
const pg_1 = require("pg");
const QueueService_js_1 = require("../ingestion/QueueService.js");
const auth_js_1 = require("../middleware/auth.js");
const guard_js_1 = require("../backpressure/guard.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = express_1.default.Router();
const orchestrator = new PipelineOrchestrator_js_1.PipelineOrchestrator();
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const queueService = new QueueService_js_1.QueueService();
// Trigger Pipeline Run
router.post('/pipelines/:key/run', auth_js_1.ensureAuthenticated, async (req, res) => {
    const key = (0, http_param_js_1.firstStringOr)(req.params.key, '');
    // In a real app, we'd fetch config from DB
    // For MVP/Demo, we accept config in body or mock it
    const config = req.body;
    if (config.key !== key) {
        return res.status(400).json({ error: 'Pipeline key mismatch' });
    }
    // Enforce tenant isolation
    // If user has a tenantId, force the pipeline execution to that tenant
    if (req.user?.tenantId) {
        config.tenantId = req.user.tenantId;
    }
    if (!config.tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
    }
    // Use QueueService if available for async
    try {
        const jobId = await queueService.enqueueIngestion(config);
        res.json({ message: 'Pipeline run initiated', pipeline: key, jobId });
    }
    catch (e) {
        // Fallback to direct run if queue fails (or just error out)
        console.error('Queue failed, running inline', e);
        orchestrator.runPipeline(config).catch(err => console.error(err));
        res.json({ message: 'Pipeline run initiated (inline fallback)', pipeline: key });
    }
});
// Admin API: Start Ingestion via Queue (New Endpoint)
router.post('/start', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        if (guard_js_1.BackpressureGuard.getInstance().shouldBlock()) {
            return res.status(503).json({ error: 'Service Unavailable: Backpressure applied' });
        }
        const config = req.body;
        // Basic validation
        if (!config.tenantId || !config.source) {
            return res.status(400).json({ error: 'Invalid pipeline configuration' });
        }
        // Enforce tenant isolation if user is restricted
        if (req.user?.tenantId && req.user.tenantId !== config.tenantId) {
            return res.status(403).json({ error: 'Tenant mismatch' });
        }
        const jobId = await queueService.enqueueIngestion(config);
        res.json({ jobId, status: 'queued' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Admin API: Check Job Status (New Endpoint)
router.get('/status/:jobId', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const status = await queueService.getJobStatus((0, http_param_js_1.firstStringOr)(req.params.jobId, ''));
        if (!status) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get Pipelines
router.get('/pipelines', auth_js_1.ensureAuthenticated, async (req, res) => {
    // Mock list
    res.json([
        { key: 'demo-file', name: 'Demo File Ingestion', type: 'file' },
        { key: 'demo-api', name: 'Demo API Ingestion', type: 'api' }
    ]);
});
// RAG Retrieval API
router.post('/search/retrieve', auth_js_1.ensureAuthenticated, async (req, res) => {
    let { query, tenantId } = req.body;
    // Input validation
    if (!query || typeof query !== 'string' || query.length > 1000) {
        return res.status(400).json({ error: 'Invalid query' });
    }
    // Enforce tenant isolation (Authoritative Binding)
    if (req.user?.tenantId) {
        tenantId = req.user.tenantId;
    }
    if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
    }
    const retrieval = new RetrievalService_js_1.RetrievalService();
    const results = await retrieval.retrieve(query, tenantId);
    res.json(results);
});
// RAG Context API
router.post('/search/context', auth_js_1.ensureAuthenticated, async (req, res) => {
    let { query, tenantId } = req.body;
    // Input validation
    if (!query || typeof query !== 'string' || query.length > 1000) {
        return res.status(400).json({ error: 'Invalid query' });
    }
    // Enforce tenant isolation (Authoritative Binding)
    if (req.user?.tenantId) {
        tenantId = req.user.tenantId;
    }
    if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
    }
    const context = await (0, rag_js_1.getRagContext)(query, tenantId);
    res.json({ context });
});
// Get DLQ Records
router.get('/dlq', auth_js_1.ensureAuthenticated, async (req, res) => {
    // Only allow admins to view DLQ
    // Role values are conventionally uppercase in this system (e.g. ADMIN)
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM dlq_records ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    }
    finally {
        client.release();
    }
});
exports.default = router;
