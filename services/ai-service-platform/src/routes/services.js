"use strict";
// @ts-nocheck
/**
 * Service Management Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceRoutes = serviceRoutes;
const index_js_1 = require("../types/index.js");
async function serviceRoutes(server) {
    // List all services
    server.get('/', async (request) => {
        const { type } = request.query;
        const services = await server.serviceRegistry.list({ type });
        return { services, total: services.length };
    });
    // Get service by ID
    server.get('/:id', async (request, reply) => {
        const { id } = request.params;
        const service = await server.serviceRegistry.get(id);
        if (!service) {
            return reply.status(404).send({ error: 'Service not found' });
        }
        return service;
    });
    // Register new service
    server.post('/', async (request, reply) => {
        const result = index_js_1.ServiceDefinitionSchema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({ error: result.error.flatten() });
        }
        const service = await server.serviceRegistry.register(result.data);
        return reply.status(201).send(service);
    });
    // Update service
    server.patch('/:id', async (request, reply) => {
        const { id } = request.params;
        const updates = request.body;
        const service = await server.serviceRegistry.update(id, updates);
        if (!service) {
            return reply.status(404).send({ error: 'Service not found' });
        }
        return service;
    });
    // Delete service
    server.delete('/:id', async (request, reply) => {
        const { id } = request.params;
        const deleted = await server.serviceRegistry.delete(id);
        if (!deleted) {
            return reply.status(404).send({ error: 'Service not found' });
        }
        return { success: true };
    });
    // Get service deployments
    server.get('/:id/deployments', async (request) => {
        const { id } = request.params;
        const deployments = await server.serviceRegistry.getDeployments(id);
        return { deployments };
    });
}
