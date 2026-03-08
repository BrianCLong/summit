"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bullmq_1 = require("bullmq");
const router = (0, express_1.Router)();
const reportQueue = new bullmq_1.Queue('report-generation', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
});
router.post('/v1/reports/render', async (req, res) => {
    const { templateId, version, data, options } = req.body;
    const classification = req.body.classification || 'unclassified';
    // Mock OPA/RFA Check
    // In real implementation: await policyClient.check(req.user, 'export', { classification })
    if (req.headers['x-simulate-policy-deny']) {
        return res.status(403).json({ error: 'Policy denied' });
    }
    try {
        const job = await reportQueue.add('render', {
            templateId,
            version,
            data,
            options,
            classification,
        });
        res.json({ jobId: job.id, status: 'queued' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/v1/reports/jobs/:id', async (req, res) => {
    const job = await reportQueue.getJob(req.params.id);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    const state = await job.getState();
    if (state === 'completed') {
        return res.json({
            id: job.id,
            state,
            result: {
                url: job.returnvalue.url,
                provenance: job.returnvalue.provenance,
                size: job.returnvalue.size,
            }
        });
    }
    if (state === 'failed') {
        return res.json({
            id: job.id,
            state,
            error: job.failedReason,
        });
    }
    res.json({ id: job.id, state, progress: job.progress });
});
exports.default = router;
