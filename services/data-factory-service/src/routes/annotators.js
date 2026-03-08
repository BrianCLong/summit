"use strict";
/**
 * Data Factory Service - Annotator Routes
 *
 * REST API endpoints for annotator management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAnnotatorRoutes = registerAnnotatorRoutes;
const schemas_js_1 = require("../models/schemas.js");
function registerAnnotatorRoutes(app, services) {
    // Create annotator
    app.post('/annotators', async (request, reply) => {
        const userId = request.headers['x-user-id'] || 'anonymous';
        const parsed = schemas_js_1.CreateAnnotatorRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: 'Validation error',
                details: parsed.error.errors,
            });
        }
        try {
            const annotator = await services.annotator.create(parsed.data, userId);
            return reply.status(201).send(annotator);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get annotator by ID
    app.get('/annotators/:id', async (request, reply) => {
        const { id } = request.params;
        try {
            const annotator = await services.annotator.getById(id);
            if (!annotator) {
                return reply.status(404).send({ error: 'Annotator not found' });
            }
            return reply.send(annotator);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get annotator by user ID
    app.get('/annotators/user/:userId', async (request, reply) => {
        const { userId } = request.params;
        try {
            const annotator = await services.annotator.getByUserId(userId);
            if (!annotator) {
                return reply.status(404).send({ error: 'Annotator not found' });
            }
            return reply.send(annotator);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // List annotators
    app.get('/annotators', async (request, reply) => {
        const queryParams = request.query;
        const filters = {
            role: queryParams.role,
            isActive: queryParams.isActive === 'true' ? true : queryParams.isActive === 'false' ? false : undefined,
            taskType: queryParams.taskType,
        };
        try {
            const annotators = await services.annotator.list(filters);
            return reply.send(annotators);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Update annotator
    app.patch('/annotators/:id', async (request, reply) => {
        const { id } = request.params;
        const userId = request.headers['x-user-id'] || 'anonymous';
        const updates = request.body;
        try {
            const annotator = await services.annotator.update(id, updates, userId);
            return reply.send(annotator);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Update annotator metrics
    app.post('/annotators/:id/metrics/refresh', async (request, reply) => {
        const { id } = request.params;
        try {
            const metrics = await services.annotator.updateMetrics(id);
            return reply.send(metrics);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Deactivate annotator
    app.post('/annotators/:id/deactivate', async (request, reply) => {
        const { id } = request.params;
        const userId = request.headers['x-user-id'] || 'anonymous';
        try {
            await services.annotator.deactivate(id, userId);
            return reply.send({ success: true });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get leaderboard
    app.get('/annotators/leaderboard', async (request, reply) => {
        const { metric, limit } = request.query;
        try {
            const leaderboard = await services.annotator.getLeaderboard(metric || 'totalLabeled', limit ? parseInt(limit, 10) : 10);
            return reply.send(leaderboard);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
}
