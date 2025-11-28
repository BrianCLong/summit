/**
 * Health Check Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { providerRegistry } from '../providers/registry.js';
import { now } from '../utils/time.js';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks?: Record<string, unknown>;
}

const startTime = Date.now();

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Basic health check
   */
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const response: HealthResponse = {
      status: 'healthy',
      timestamp: now(),
      version: '1.0.0',
      uptime: Date.now() - startTime,
    };

    return reply.status(200).send(response);
  });

  /**
   * Readiness check
   */
  fastify.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const providerHealth = await providerRegistry.checkAllProvidersHealth();
    const allHealthy = Array.from(providerHealth.values()).every(
      (h) => h.status === 'available' || h.status === 'degraded'
    );

    const response: HealthResponse = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: now(),
      version: '1.0.0',
      uptime: Date.now() - startTime,
      checks: {
        providers: Object.fromEntries(
          Array.from(providerHealth.entries()).map(([k, v]) => [k, v.status])
        ),
      },
    };

    return reply.status(allHealthy ? 200 : 503).send(response);
  });

  /**
   * Liveness check
   */
  fastify.get('/health/live', async (request: FastifyRequest, reply: FastifyReply) => {
    const response: HealthResponse = {
      status: 'healthy',
      timestamp: now(),
      version: '1.0.0',
      uptime: Date.now() - startTime,
    };

    return reply.status(200).send(response);
  });

  /**
   * Detailed health check
   */
  fastify.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    const providerHealth = await providerRegistry.checkAllProvidersHealth();

    const checks: Record<string, unknown> = {
      providers: Object.fromEntries(providerHealth),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };

    const allHealthy = Array.from(providerHealth.values()).every(
      (h) => h.status === 'available' || h.status === 'degraded'
    );

    const response: HealthResponse = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: now(),
      version: '1.0.0',
      uptime: Date.now() - startTime,
      checks,
    };

    return reply.status(200).send(response);
  });
}
