"use strict";
// @ts-nocheck
/**
 * Health Check Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
async function healthRoutes(server) {
    server.get('/health', async () => ({
        status: 'healthy',
        service: 'ai-service-platform',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    }));
    server.get('/health/ready', async () => {
        const stats = server.serviceRegistry.getStats();
        return {
            status: 'ready',
            services: stats.totalServices,
            deployments: stats.activeDeployments,
        };
    });
    server.get('/health/live', async () => ({ status: 'live' }));
}
