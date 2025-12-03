/**
 * Cross-Border Module Integration
 *
 * This file shows how to integrate the cross-border module into the main server.
 * Add the following to server/src/app.ts:
 *
 * ```typescript
 * import crossBorderRouter from './cross-border/router.js';
 * import { getCrossBorderGateway } from './cross-border/index.js';
 *
 * // Register the cross-border routes
 * app.use('/api/cross-border', crossBorderRouter);
 *
 * // Initialize the gateway (in server startup)
 * const gateway = getCrossBorderGateway();
 * await gateway.initialize();
 * ```
 */

import type { Express } from 'express';
import crossBorderRouter from './router.js';
import { getCrossBorderGateway } from './gateway.js';
import { getCrossBorderMetrics, updateActivePartners, updateActiveSessions } from './metrics.js';
import { crossBorderTypeDefs, crossBorderResolvers } from './graphql/index.js';

/**
 * Initialize the cross-border module
 */
export async function initializeCrossBorder(): Promise<void> {
  const gateway = getCrossBorderGateway();
  await gateway.initialize();

  // Update metrics periodically
  setInterval(() => {
    const status = gateway.getStatus();
    updateActivePartners(status.activePartners);
    updateActiveSessions(status.activeSessions);
  }, 30000);

  console.log('[cross-border] Module initialized');
}

/**
 * Register cross-border routes with Express app
 */
export function registerCrossBorderRoutes(app: Express, basePath = '/api/cross-border'): void {
  app.use(basePath, crossBorderRouter);
  console.log(`[cross-border] Routes registered at ${basePath}`);
}

/**
 * Get GraphQL schema extensions for cross-border module
 */
export function getCrossBorderGraphQL() {
  return {
    typeDefs: crossBorderTypeDefs,
    resolvers: crossBorderResolvers,
  };
}

/**
 * Shutdown the cross-border module
 */
export async function shutdownCrossBorder(): Promise<void> {
  const gateway = getCrossBorderGateway();
  await gateway.shutdown();
  console.log('[cross-border] Module shut down');
}

/**
 * Health check for cross-border module
 */
export function getCrossBorderHealth() {
  const gateway = getCrossBorderGateway();
  const metrics = getCrossBorderMetrics();
  const status = gateway.getStatus();

  return {
    module: 'cross-border',
    status: status.activePartners > 0 ? 'healthy' : 'degraded',
    details: {
      ...status,
      metricsCollected: Object.keys(metrics.toJSON()).length > 0,
    },
  };
}

// Re-export everything for convenience
export * from './index.js';
