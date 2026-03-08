"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExecutorRoutes = createExecutorRoutes;
const express_1 = require("express");
function createExecutorRoutes(executor) {
    const router = (0, express_1.Router)();
    /**
     * Execute plugin
     */
    router.post('/', async (req, res, next) => {
        try {
            const { pluginId, action, parameters, timeout } = req.body;
            const jobId = await executor.execute({
                pluginId,
                action,
                parameters,
                timeout,
            });
            res.status(202).json({
                jobId,
                status: 'queued',
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Get job status
     */
    router.get('/jobs/:jobId', async (req, res, next) => {
        try {
            const { jobId } = req.params;
            const status = await executor.getJobStatus(jobId);
            res.json(status);
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
