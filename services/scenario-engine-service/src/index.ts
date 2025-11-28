/**
 * Scenario Engine Service
 *
 * What-If & Counterfactual Modeling for IntelGraph
 *
 * Features:
 * - Sandbox scenario copies of graphs/cases
 * - What-if tools (remove/add edges, delay events, change parameters)
 * - Isolated from production data
 * - Impact metrics computation
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { correlationId, tenantGuard } from './middleware/index.js';
import { createScenarioRoutes, createWhatIfRoutes, createAnalyticsRoutes } from './routes/index.js';
import { ScenarioStore, type SourceGraphProvider } from './services/index.js';

export interface ScenarioEngineConfig {
  port: number;
  sourceProvider?: SourceGraphProvider;
  maxScenariosPerTenant?: number;
  defaultRetentionDays?: number;
  enableAutoCleanup?: boolean;
}

const DEFAULT_CONFIG: ScenarioEngineConfig = {
  port: 3500,
  maxScenariosPerTenant: 100,
  defaultRetentionDays: 30,
  enableAutoCleanup: true,
};

export function createApp(config: Partial<ScenarioEngineConfig> = {}): {
  app: Express;
  store: ScenarioStore;
} {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const app = express();

  // Initialize store
  const store = new ScenarioStore(mergedConfig.sourceProvider, {
    maxScenariosPerTenant: mergedConfig.maxScenariosPerTenant,
    defaultRetentionDays: mergedConfig.defaultRetentionDays,
    enableAutoCleanup: mergedConfig.enableAutoCleanup,
  });

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(correlationId);

  // Health endpoints (no auth required)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'scenario-engine',
      timestamp: new Date().toISOString(),
      environment: 'non-production',
    });
  });

  app.get('/health/ready', (_req: Request, res: Response) => {
    res.json({
      ready: true,
      service: 'scenario-engine',
    });
  });

  app.get('/health/live', (_req: Request, res: Response) => {
    res.json({
      alive: true,
      service: 'scenario-engine',
    });
  });

  // Metrics endpoint
  app.get('/metrics', (_req: Request, res: Response) => {
    const stats = store.getStats();
    res.json({
      scenarios_total: stats.totalScenarios,
      scenarios_by_status: stats.byStatus,
      scenarios_by_mode: stats.byMode,
      scenarios_by_tenant: stats.byTenant,
    });
  });

  // API routes (require tenant)
  const apiRouter = express.Router();
  apiRouter.use(tenantGuard);

  // Mount route handlers
  apiRouter.use('/scenarios', createScenarioRoutes(store));
  apiRouter.use('/whatif', createWhatIfRoutes(store));
  apiRouter.use('/analytics', createAnalyticsRoutes(store));

  app.use('/api/v1', apiRouter);

  // Error handling
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      message: 'The requested endpoint does not exist',
    });
  });

  return { app, store };
}

// Start server if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const port = parseInt(process.env.PORT || '3500', 10);
  const { app, store } = createApp({ port });

  const server = app.listen(port, () => {
    console.log(`🚀 Scenario Engine Service running on port ${port}`);
    console.log(`   Environment: non-production (sandbox mode only)`);
    console.log(`   Health: http://localhost:${port}/health`);
    console.log(`   API: http://localhost:${port}/api/v1`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down Scenario Engine Service...');
    store.shutdown();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default createApp;

// Re-export types and services for library usage
export * from './types/index.js';
export * from './services/index.js';
