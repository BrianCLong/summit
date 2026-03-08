"use strict";
/**
 * Data Factory Service - Export Routes
 *
 * REST API endpoints for dataset export management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExportRoutes = registerExportRoutes;
const schemas_js_1 = require("../models/schemas.js");
function registerExportRoutes(app, services) {
    // Create export
    app.post('/exports', async (request, reply) => {
        const userId = request.headers['x-user-id'] || 'anonymous';
        const parsed = schemas_js_1.CreateExportRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: 'Validation error',
                details: parsed.error.errors,
            });
        }
        try {
            const exportRecord = await services.export.createExport(parsed.data.datasetId, parsed.data.format, parsed.data.policyProfileId, userId, {
                splits: parsed.data.splits,
                filterCriteria: parsed.data.filterCriteria,
            });
            return reply.status(202).send(exportRecord);
        }
        catch (error) {
            return reply.status(400).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get export by ID
    app.get('/exports/:id', async (request, reply) => {
        const { id } = request.params;
        try {
            const exportRecord = await services.export.getExport(id);
            if (!exportRecord) {
                return reply.status(404).send({ error: 'Export not found' });
            }
            return reply.send(exportRecord);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Get exports for dataset
    app.get('/datasets/:datasetId/exports', async (request, reply) => {
        const { datasetId } = request.params;
        try {
            const exports = await services.export.getExportsForDataset(datasetId);
            return reply.send(exports);
        }
        catch (error) {
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Download export file
    app.get('/exports/:id/download', async (request, reply) => {
        const { id } = request.params;
        try {
            const fileData = await services.export.getExportFile(id);
            if (!fileData) {
                return reply.status(404).send({ error: 'Export file not found' });
            }
            reply.header('Content-Type', fileData.contentType);
            reply.header('Content-Disposition', `attachment; filename="${fileData.filename}"`);
            return reply.send(fileData.stream);
        }
        catch (error) {
            return reply.status(400).send({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // Delete export
    app.delete('/exports/:id', async (request, reply) => {
        const { id } = request.params;
        const userId = request.headers['x-user-id'] || 'anonymous';
        try {
            await services.export.deleteExport(id, userId);
            return reply.status(204).send();
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
}
