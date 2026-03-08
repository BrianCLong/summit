"use strict";
// @ts-nocheck
/**
 * Data Factory Service - Labeling Routes
 *
 * REST API endpoints for labeling jobs and queues.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLabelingRoutes = registerLabelingRoutes;
const schemas_js_1 = require("../models/schemas.js");
function registerLabelingRoutes(app, services) {
    // ============================================================================
    // Queue Management
    // ============================================================================
    // Create labeling queue
    app.post('/queues', async (request, reply) => {
        const userId = request.headers['x-user-id'] || 'anonymous';
        const { datasetId, name, taskType, qualitySettings } = request.body;
        const parsedSettings = schemas_js_1.QualitySettingsSchema.safeParse(qualitySettings);
        if (!parsedSettings.success) {
            return reply.status(400).send({
                error: 'Invalid quality settings',
                details: parsedSettings.error.errors,
            });
        }
        try {
            const queue = await services.labeling.createQueue(datasetId, name, taskType, parsedSettings.data, userId);
            return reply.status(201).send(queue);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get queue by ID
    app.get('/queues/:id', async (request, reply) => {
        const { id } = request.params;
        try {
            const queue = await services.labeling.getQueue(id);
            if (!queue) {
                return reply.status(404).send({ error: 'Queue not found' });
            }
            return reply.send(queue);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get queues for dataset
    app.get('/datasets/:datasetId/queues', async (request, reply) => {
        const { datasetId } = request.params;
        try {
            const queues = await services.labeling.getQueuesByDataset(datasetId);
            return reply.send(queues);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Add annotator to queue
    app.post('/queues/:id/annotators', async (request, reply) => {
        const { id } = request.params;
        const { annotatorId } = request.body;
        const userId = request.headers['x-user-id'] || 'anonymous';
        try {
            await services.labeling.addAnnotatorToQueue(id, annotatorId, userId);
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.status(400).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // ============================================================================
    // Job Management
    // ============================================================================
    // Create jobs for samples
    app.post('/jobs/batch', async (request, reply) => {
        const userId = request.headers['x-user-id'] || 'anonymous';
        const { datasetId, sampleIds, taskType, instructions, labelSchemaId } = request.body;
        try {
            const count = await services.labeling.createJobsForSamples(datasetId, sampleIds, taskType, instructions, labelSchemaId, userId);
            return reply.status(201).send({ created: count });
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get job by ID
    app.get('/jobs/:id', async (request, reply) => {
        const { id } = request.params;
        try {
            const job = await services.labeling.getJob(id);
            if (!job) {
                return reply.status(404).send({ error: 'Job not found' });
            }
            return reply.send(job);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get jobs for annotator
    app.get('/annotators/:annotatorId/jobs', async (request, reply) => {
        const { annotatorId } = request.params;
        const { status } = request.query;
        try {
            const jobs = await services.labeling.getJobsForAnnotator(annotatorId, status);
            return reply.send(jobs);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Assign jobs
    app.post('/jobs/assign', async (request, reply) => {
        const parsed = schemas_js_1.AssignJobRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: 'Validation error',
                details: parsed.error.errors,
            });
        }
        try {
            const jobs = await services.labeling.assignJobs(parsed.data);
            return reply.send(jobs);
        }
        catch (error) {
            return reply.status(400).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Start job
    app.post('/jobs/:id/start', async (request, reply) => {
        const { id } = request.params;
        const userId = request.headers['x-user-id'] || 'anonymous';
        try {
            const job = await services.labeling.startJob(id, userId);
            return reply.send(job);
        }
        catch (error) {
            return reply.status(400).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // ============================================================================
    // Label Submission
    // ============================================================================
    // Submit label
    app.post('/labels', async (request, reply) => {
        const userId = request.headers['x-user-id'] || 'anonymous';
        const parsed = schemas_js_1.SubmitLabelRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: 'Validation error',
                details: parsed.error.errors,
            });
        }
        try {
            const labelSet = await services.labeling.submitLabel(parsed.data, userId);
            return reply.status(201).send(labelSet);
        }
        catch (error) {
            return reply.status(400).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get label set
    app.get('/labels/:id', async (request, reply) => {
        const { id } = request.params;
        try {
            const labelSet = await services.labeling.getLabelSet(id);
            if (!labelSet) {
                return reply.status(404).send({ error: 'Label set not found' });
            }
            return reply.send(labelSet);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // ============================================================================
    // Review
    // ============================================================================
    // Review label
    app.post('/labels/:id/review', async (request, reply) => {
        const { id } = request.params;
        const userId = request.headers['x-user-id'] || 'anonymous';
        const body = request.body;
        const parsed = schemas_js_1.ReviewLabelRequestSchema.safeParse({
            labelSetId: id,
            ...body,
        });
        if (!parsed.success) {
            return reply.status(400).send({
                error: 'Validation error',
                details: parsed.error.errors,
            });
        }
        try {
            const labelSet = await services.labeling.reviewLabel(parsed.data, userId);
            return reply.send(labelSet);
        }
        catch (error) {
            return reply.status(400).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get labels needing review
    app.get('/datasets/:datasetId/labels/review', async (request, reply) => {
        const { datasetId } = request.params;
        const { limit } = request.query;
        try {
            const labels = await services.labeling.getLabelsNeedingReview(datasetId, limit ? parseInt(limit, 10) : 20);
            return reply.send(labels);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // ============================================================================
    // Statistics
    // ============================================================================
    // Get job statistics
    app.get('/datasets/:datasetId/jobs/statistics', async (request, reply) => {
        const { datasetId } = request.params;
        try {
            const stats = await services.labeling.getJobStatistics(datasetId);
            return reply.send(stats);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
}
