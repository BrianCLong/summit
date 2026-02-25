import { describe, it, expect, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: Request, res: Response, next: NextFunction) => {
    const role = req.headers['x-test-user-role'];
    if (!role || typeof role !== 'string') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    (req as any).user = { id: 'test-user', role };
    next();
  },
  ensureRole:
    (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
      const role = (req as any).user?.role;
      if (!role || !roles.includes(role)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      next();
    },
}));

const mockDrService = {
  addTarget: jest.fn(),
  listTargets: jest.fn(() => []),
  reportStatus: jest.fn(),
};

jest.unstable_mockModule(
  '../../dr/backup-inventory/BackupInventoryService.js',
  () => ({
    BackupInventoryService: {
      getInstance: () => mockDrService,
    },
  })
);

jest.unstable_mockModule('../../dr/backup-inventory/PolicyChecker.js', () => ({
  PolicyChecker: class {
    check() {
      return { ok: true };
    }
  },
}));

const mockAnalyticsService = {
  findPaths: jest.fn(),
  detectCommunities: jest.fn(() => ({ communities: [] })),
  calculateCentrality: jest.fn(),
  minePatterns: jest.fn(),
  detectAnomalies: jest.fn(),
};

jest.unstable_mockModule('../../services/AnalyticsService.js', () => ({
  AnalyticsService: {
    getInstance: () => mockAnalyticsService,
  },
}));

jest.unstable_mockModule('../../config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.unstable_mockModule('../../privacy/dp/DifferentialPrivacyEngine.js', () => ({
  dpEngine: {
    privatizeAggregate: (value: number) => value,
  },
}));

jest.unstable_mockModule(
  '../../analytics/telemetry/TelemetryController.js',
  () => ({
    handleTelemetryEvent: (_req: Request, res: Response) => {
      res.status(202).json({ ok: true });
    },
  })
);

const mockAirgapService = {
  exportBundle: jest.fn(async () => ({ ok: true })),
  importBundle: jest.fn(async () => ({ ok: true })),
  getImport: jest.fn(async () => ({ id: 'import-1' })),
};

jest.unstable_mockModule('../../services/AirgapService.js', () => ({
  AirgapService: class {
    exportBundle = mockAirgapService.exportBundle;
    importBundle = mockAirgapService.importBundle;
    getImport = mockAirgapService.getImport;
  },
}));

jest.unstable_mockModule('../../middleware/tenantHeader.js', () => ({
  tenantHeader: () => (req: Request, _res: Response, next: NextFunction) => {
    (req as any).tenantId = req.headers['x-tenant-id'] || 'tenant-test';
    next();
  },
}));

jest.unstable_mockModule('../../config/database.js', () => ({
  getNeo4jDriver: () => ({
    session: () => ({
      close: async () => undefined,
    }),
  }),
}));

const drRouter = (await import('../dr.js')).default;
const analyticsRouter = (await import('../analytics.js')).default;
const { airgapRouter } = await import('../airgap.js');

const buildApp = (mountPath: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  return app;
};

describeIf('ops router authz guards', () => {
  it('enforces DR router auth and role policy', async () => {
    const app = buildApp('/api/dr', drRouter);

    const unauth = await request(app).get('/api/dr/backups');
    expect(unauth.status).toBe(401);

    const forbidden = await request(app)
      .get('/api/dr/backups')
      .set('x-test-user-role', 'ANALYST');
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get('/api/dr/backups')
      .set('x-test-user-role', 'ADMIN');
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual([]);
  });

  it('enforces analytics router auth and role policy', async () => {
    mockAnalyticsService.findPaths.mockResolvedValueOnce({ paths: [] });
    const app = buildApp('/api/analytics', analyticsRouter);

    const unauth = await request(app).get(
      '/api/analytics/path?sourceId=s1&targetId=t1'
    );
    expect(unauth.status).toBe(401);

    const forbidden = await request(app)
      .get('/api/analytics/path?sourceId=s1&targetId=t1')
      .set('x-test-user-role', 'OPERATOR');
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get('/api/analytics/path?sourceId=s1&targetId=t1')
      .set('x-test-user-role', 'ANALYST');
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual({ paths: [] });
  });

  it('enforces airgap router auth and role policy', async () => {
    const app = buildApp('/api/airgap', airgapRouter);

    const unauth = await request(app).get('/api/airgap/imports/import-1');
    expect(unauth.status).toBe(401);

    const forbidden = await request(app)
      .get('/api/airgap/imports/import-1')
      .set('x-test-user-role', 'OPERATOR');
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get('/api/airgap/imports/import-1')
      .set('x-test-user-role', 'ADMIN');
    expect(allowed.status).toBe(200);
    expect(allowed.body).toMatchObject({ id: 'import-1' });
  });
});
