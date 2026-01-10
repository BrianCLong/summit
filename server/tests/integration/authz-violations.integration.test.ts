import express from 'express';
import request from 'supertest';
import { ensureAuthenticated, requirePermission } from '../../src/middleware/auth.js';
import AuthService from '../../src/services/AuthService.js';

let verifyTokenSpy: jest.SpiedFunction<AuthService['verifyToken']>;
let hasPermissionSpy: jest.SpiedFunction<AuthService['hasPermission']>;

const buildApp = () => {
  const app = express();
  app.use(express.json());

  app.post(
    '/graph/query',
    ensureAuthenticated,
    requirePermission('graph:read'),
    (req, res) => {
      if (!req.body?.query || typeof req.body.query !== 'string') {
        return res.status(422).json({ error: 'Invalid query payload' });
      }
      return res.json({ data: [], enforced: true });
    },
  );

  app.post(
    '/ingest/events',
    ensureAuthenticated,
    requirePermission('ingest:write'),
    (req, res) => {
      const { tenantId, events } = req.body || {};
      if (!tenantId || typeof tenantId !== 'string') {
        return res.status(422).json({ error: 'Missing tenantId' });
      }
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(422).json({ error: 'Events payload required' });
      }
      return res.status(202).json({ accepted: events.length, tenantId });
    },
  );

  return app;
};

beforeEach(() => {
  verifyTokenSpy = jest.spyOn(AuthService.prototype, 'verifyToken');
  hasPermissionSpy = jest.spyOn(AuthService.prototype, 'hasPermission');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Cross-service authz and validation enforcement', () => {
  it('rejects tampered tokens at the graph surface before evaluating validation', async () => {
    const app = buildApp();
    verifyTokenSpy.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/graph/query')
      .set('Authorization', 'Bearer definitely-invalid')
      .send({ query: '{ nodes { id } }' });

    expect(res.status).toBe(401);
    expect(hasPermissionSpy).not.toHaveBeenCalled();
  });

  it('denies ingestion attempts when permissions are missing even with syntactically valid payloads', async () => {
    const app = buildApp();
    verifyTokenSpy.mockResolvedValueOnce({ id: 'user-1', permissions: [] } as any);
    hasPermissionSpy.mockReturnValue(false);

    const res = await request(app)
      .post('/ingest/events')
      .set('Authorization', 'Bearer valid-token')
      .send({ tenantId: 'tenant-a', events: [{ id: 'evt-1' }] });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
    expect(hasPermissionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'ingest:write',
    );
  });

  it('enforces validation blocks across services even when auth succeeds', async () => {
    const app = buildApp();
    verifyTokenSpy.mockResolvedValue({ id: 'user-2', permissions: ['graph:read', 'ingest:write'] } as any);
    hasPermissionSpy.mockImplementation((user, permission) =>
      Array.isArray((user as any).permissions) && (user as any).permissions.includes(permission),
    );

    const graphResponse = await request(app)
      .post('/graph/query')
      .set('Authorization', 'Bearer ok-token')
      .send({});

    const ingestResponse = await request(app)
      .post('/ingest/events')
      .set('Authorization', 'Bearer ok-token')
      .send({ tenantId: '', events: [] });

    expect(graphResponse.status).toBe(422);
    expect(ingestResponse.status).toBe(422);
    expect(hasPermissionSpy).toHaveBeenCalledTimes(2);
  });
});
