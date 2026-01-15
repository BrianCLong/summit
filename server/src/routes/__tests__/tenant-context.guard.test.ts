import express, { type Router } from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

const mockListPlugins = jest.fn(() =>
  Promise.resolve({ data: [], pageInfo: { total: 0 } }),
);

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: express.Response, next: express.NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    req.user = {
      id: (req.headers['x-user-id'] as string) || 'user-123',
      tenantId,
      tenant_id: tenantId,
      role: (req.headers['x-user-role'] as string) || 'admin',
    };
    next();
  },
}));

jest.unstable_mockModule('../../services/AuthorizationService.js', () => ({
  AuthorizationServiceImpl: jest.fn().mockImplementation(() => ({
    assertCan: jest.fn(() => Promise.resolve()),
  })),
}));

jest.unstable_mockModule('../../plugins/PluginRegistry.js', () => ({
  __esModule: true,
  PluginRegistry: jest.fn().mockImplementation((_opts, _logger, moduleMocks) => ({
    listPlugins: ((moduleMocks as any)?.listPlugins as jest.Mock) || mockListPlugins,
    getPlugin: jest.fn(() => Promise.resolve({ data: {} })),
    getTenantConfig: jest.fn(),
    saveTenantConfig: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../plugins/PluginManager.js', () => ({
  PluginManager: jest.fn().mockImplementation(() => ({
    enablePlugin: jest.fn(),
    disablePlugin: jest.fn(),
    executeAction: jest.fn(),
    getHealthStatus: jest.fn(),
    uninstallPlugin: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../controllers/OpaController.js', () => ({
  OpaController: {
    getPolicies: jest.fn((req: express.Request, res: express.Response) => res.json({ policies: [] })),
    getPolicyContent: jest.fn((req: express.Request, res: express.Response) => res.json({ name: req.params.filename })),
    evaluatePolicy: jest.fn((req: express.Request, res: express.Response) => res.json({
      decision: 'allow',
      input: req.body,
    })),
    validatePolicy: jest.fn((req: express.Request, res: express.Response) => res.json({ valid: true })),
  },
}));

jest.unstable_mockModule('../../services/IngestService.js', () => ({
  IngestService: jest.fn().mockImplementation(() => ({
    ingest: jest.fn(() =>
      Promise.resolve({
        success: true,
        provenanceId: 'prov-1',
        entitiesCreated: 1,
        entitiesUpdated: 0,
        relationshipsCreated: 0,
        relationshipsUpdated: 0,
        errors: [],
      }),
    ),
  })),
}));

jest.unstable_mockModule('../../services/opa-client.js', () => ({
  verifyTenantAccess: jest.fn(() => Promise.resolve()),
}));

jest.unstable_mockModule('../../tenancy/TenantIsolationGuard.js', () => ({
  tenantIsolationGuard: {
    evaluatePolicy: jest.fn().mockReturnValue({ allowed: true }),
    enforceIngestionCap: jest.fn(() =>
      Promise.resolve({ allowed: true, limit: 100, reset: Date.now() + 1000 }),
    ),
    enforceStorageQuota: jest.fn(() => Promise.resolve({ allowed: true })),
  },
}));

let ingestRouter: Router;
let pluginAdminRouter: Router;
let opaRoutes: Router;

beforeAll(async () => {
  ({ ingestRouter } = await import('../ingest.js'));
  ({ default: pluginAdminRouter } = await import('../plugins/plugin-admin.js'));
  ({ opaRoutes } = await import('../opa.js'));
});

const buildIngestApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = {
      id: 'ingest-user',
      tenantId: req.headers['x-tenant-id'] as string,
    };
    next();
  });
  app.use(ingestRouter);
  return app;
};

const buildPluginApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/plugins', pluginAdminRouter);
  return app;
};

const buildOpaApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/opa', opaRoutes);
  return app;
};

describeIf('tenant context enforcement', () => {
  const validIngestPayload = {
    tenantId: 'body-tenant',
    sourceType: 'test',
    sourceId: 'source-1',
    entities: [{ kind: 'node', labels: [], properties: {} }],
    relationships: [],
  };

  it('rejects ingest requests without tenant context', async () => {
    const response = await request(buildIngestApp())
      .post('/api/v1/ingest')
      .send(validIngestPayload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('TENANT_CONTEXT_REQUIRED');
  });

  it('allows ingest when tenant context is present', async () => {
    const response = await request(buildIngestApp())
      .post('/api/v1/ingest')
      .set('x-tenant-id', 'tenant-123')
      .send(validIngestPayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('rejects plugin reads without tenant context', async () => {
    const response = await request(buildPluginApp()).get('/plugins');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('TENANT_CONTEXT_REQUIRED');
  });

  it('allows plugin reads with tenant context', async () => {
    const response = await request(buildPluginApp())
      .get('/plugins')
      .set('x-tenant-id', 'tenant-123');

    expect(response.status).toBe(200);
    expect(mockListPlugins).toHaveBeenCalled();
  });

  it('rejects policy evaluation without tenant context', async () => {
    const response = await request(buildOpaApp())
      .post('/opa/evaluate')
      .send({ policy: 'package test' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('TENANT_CONTEXT_REQUIRED');
  });

  it('allows policy evaluation with tenant context', async () => {
    const response = await request(buildOpaApp())
      .post('/opa/evaluate')
      .set('x-tenant-id', 'tenant-123')
      .send({ policy: 'package test' });

    expect(response.status).toBe(200);
    expect(response.body.decision).toBe('allow');
  });
});
