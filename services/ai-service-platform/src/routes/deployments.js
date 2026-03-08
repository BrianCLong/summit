"use strict";
// @ts-nocheck
/**
 * Deployment Management Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploymentRoutes = deploymentRoutes;
const zod_1 = require("zod");
const DeployRequestSchema = zod_1.z.object({
    serviceId: zod_1.z.string().uuid(),
    environment: zod_1.z.enum(['development', 'staging', 'production']),
    version: zod_1.z.string().optional(),
    overrides: zod_1.z.record(zod_1.z.unknown()).optional(),
});
async function deploymentRoutes(server) {
    // Deploy a service - the "hours not months" endpoint
    server.post('/', async (request, reply) => {
        const result = DeployRequestSchema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({ error: result.error.flatten() });
        }
        try {
            const deployment = await server.deploymentOrchestrator.deploy(result.data);
            return reply.status(201).send({
                message: 'Service deployed successfully',
                ...deployment,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Deployment failed';
            return reply.status(500).send({ error: message });
        }
    });
    // Get deployment status
    server.get('/:id', async (request, reply) => {
        const { id } = request.params;
        // Would query from registry/K8s
        return reply.status(200).send({ id, status: 'running' });
    });
    // Scale deployment
    server.post('/:id/scale', async (request, reply) => {
        const { id } = request.params;
        const { replicas } = request.body;
        const deployment = await server.deploymentOrchestrator.scale(id, replicas);
        if (!deployment) {
            return reply.status(404).send({ error: 'Deployment not found' });
        }
        return deployment;
    });
    // Stop deployment
    server.post('/:id/stop', async (request, reply) => {
        const { id } = request.params;
        await server.deploymentOrchestrator.stop(id);
        return { success: true };
    });
    // Rollback deployment
    server.post('/:id/rollback', async (request, reply) => {
        const { id } = request.params;
        const { targetVersion } = request.body;
        try {
            const deployment = await server.deploymentOrchestrator.rollback(id, targetVersion);
            return deployment;
        }
        catch {
            return reply.status(500).send({ error: 'Rollback failed' });
        }
    });
}
