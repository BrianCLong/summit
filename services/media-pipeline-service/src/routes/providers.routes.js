"use strict";
/**
 * Provider Management Routes
 *
 * API endpoints for provider health and configuration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRoutes = providerRoutes;
const registry_js_1 = require("../providers/registry.js");
async function providerRoutes(fastify) {
    /**
     * List all providers
     */
    fastify.get('/api/v1/providers', async (request, reply) => {
        return reply.status(200).send({
            stt: registry_js_1.providerRegistry.listSTTProviders(),
            diarization: registry_js_1.providerRegistry.listDiarizationProviders(),
        });
    });
    /**
     * Get provider health status
     */
    fastify.get('/api/v1/providers/health', async (request, reply) => {
        const healthResults = await registry_js_1.providerRegistry.checkAllProvidersHealth();
        return reply.status(200).send({
            providers: Object.fromEntries(healthResults),
        });
    });
    /**
     * Get STT provider details
     */
    fastify.get('/api/v1/providers/stt/:id', async (request, reply) => {
        const { id } = request.params;
        const provider = registry_js_1.providerRegistry.getSTTProvider(id);
        if (!provider) {
            return reply.status(404).send({
                error: 'Not found',
                message: `STT provider ${id} not found`,
            });
        }
        const health = await provider.healthCheck();
        return reply.status(200).send({
            id: provider.id,
            name: provider.name,
            supportedFormats: provider.supportedFormats,
            supportedLanguages: provider.supportedLanguages,
            maxDurationMs: provider.maxDurationMs,
            maxFileSizeBytes: provider.maxFileSizeBytes,
            health,
        });
    });
    /**
     * Get STT provider health
     */
    fastify.get('/api/v1/providers/stt/:id/health', async (request, reply) => {
        const { id } = request.params;
        const health = await registry_js_1.providerRegistry.checkSTTProviderHealth(id);
        if (!health) {
            return reply.status(404).send({
                error: 'Not found',
                message: `STT provider ${id} not found`,
            });
        }
        return reply.status(200).send(health);
    });
    /**
     * Get diarization provider details
     */
    fastify.get('/api/v1/providers/diarization/:id', async (request, reply) => {
        const { id } = request.params;
        const provider = registry_js_1.providerRegistry.getDiarizationProvider(id);
        if (!provider) {
            return reply.status(404).send({
                error: 'Not found',
                message: `Diarization provider ${id} not found`,
            });
        }
        const health = await provider.healthCheck();
        return reply.status(200).send({
            id: provider.id,
            name: provider.name,
            supportedFormats: provider.supportedFormats,
            maxDurationMs: provider.maxDurationMs,
            maxSpeakers: provider.maxSpeakers,
            health,
        });
    });
    /**
     * Get diarization provider health
     */
    fastify.get('/api/v1/providers/diarization/:id/health', async (request, reply) => {
        const { id } = request.params;
        const health = await registry_js_1.providerRegistry.checkDiarizationProviderHealth(id);
        if (!health) {
            return reply.status(404).send({
                error: 'Not found',
                message: `Diarization provider ${id} not found`,
            });
        }
        return reply.status(200).send(health);
    });
}
