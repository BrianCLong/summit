/**
 * Health Check Routes
 */

import type { FastifyInstance } from 'fastify';

export async function healthRoutes(server: FastifyInstance) {
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
