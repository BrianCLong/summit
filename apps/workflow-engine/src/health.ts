import type { Express } from 'express';

export type ReadinessSnapshot = {
  ready: boolean;
  postgres: boolean;
  neo4j: boolean;
  redis: boolean;
  workflowService: boolean;
};

export const readinessState: ReadinessSnapshot = {
  ready: false,
  postgres: false,
  neo4j: false,
  redis: false,
  workflowService: false,
};

export function getReadinessSnapshot(): ReadinessSnapshot {
  return {
    ready:
      readinessState.ready &&
      readinessState.postgres &&
      readinessState.neo4j &&
      readinessState.redis &&
      readinessState.workflowService,
    postgres: readinessState.postgres,
    neo4j: readinessState.neo4j,
    redis: readinessState.redis,
    workflowService: readinessState.workflowService,
  };
}

export function registerHealthEndpoints(app: Express) {
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'workflow-engine',
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  app.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      service: 'workflow-engine',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/readyz', (_req, res) => {
    const snapshot = getReadinessSnapshot();
    const status = snapshot.ready ? 200 : 503;
    res.status(status).json({
      ok: snapshot.ready,
      service: 'workflow-engine',
      timestamp: new Date().toISOString(),
      dependencies: {
        postgres: snapshot.postgres,
        neo4j: snapshot.neo4j,
        redis: snapshot.redis,
        workflowService: snapshot.workflowService,
      },
    });
  });
}
