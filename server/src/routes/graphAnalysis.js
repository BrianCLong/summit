"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GraphAnalysisService_js_1 = require("../analysis/GraphAnalysisService.js");
const router = express_1.default.Router();
const service = GraphAnalysisService_js_1.GraphAnalysisService.getInstance();
// Helper to get tenantId (assuming request is authenticated and has user.tenantId)
const getTenantId = (req) => {
    const user = req.user;
    if (!user || !user.tenantId) {
        throw new Error('Tenant ID missing from request context');
    }
    return user.tenantId;
};
// POST /api/graph/analysis/run
router.post('/run', async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { algorithm, params } = req.body;
        if (!algorithm) {
            res.status(400).json({ error: 'Missing algorithm' });
            return;
        }
        // Validate algorithm key
        const validAlgorithms = [
            'shortestPath',
            'kHopNeighborhood',
            'degreeCentrality',
            'connectedComponents'
        ];
        if (!validAlgorithms.includes(algorithm)) {
            res.status(400).json({ error: `Invalid algorithm. Must be one of: ${validAlgorithms.join(', ')}` });
            return;
        }
        const job = await service.createJob(tenantId, algorithm, params || {});
        // For MVP synchronous execution if requested or short jobs
        if (req.query.async === 'true') {
            // Fire and forget (or rather, run in background)
            service.runJob(job.id).catch(err => console.error(err));
            res.json({ jobId: job.id, status: 'pending' });
        }
        else {
            const completedJob = await service.runJob(job.id);
            if (completedJob.status === 'failed') {
                res.status(500).json({ error: completedJob.error, jobId: job.id });
            }
            else {
                res.json(completedJob);
            }
        }
    }
    catch (error) {
        next(error);
    }
});
// GET /api/graph/analysis/:jobId
router.get('/:jobId', async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const { jobId } = req.params;
        const job = service.getJob(jobId, tenantId);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        res.json(job);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
