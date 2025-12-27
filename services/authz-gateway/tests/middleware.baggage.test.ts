import express from 'express';
import request from 'supertest';
import { propagation } from '@opentelemetry/api';

import { requireAuth, type AuthenticatedRequest } from '../src/middleware';
import type { AttributeService } from '../src/attribute-service';
import { sessionManager } from '../src/session';

jest.mock('../src/session');

const attributeServiceStub = {
  getSubjectAttributes: jest.fn().mockResolvedValue({
    id: 'alice',
    tenantId: 'tenant-1',
    residency: 'us',
    clearance: 'public',
    loa: 'loa1',
    roles: [],
    entitlements: [],
    riskScore: 1,
    groups: [],
    metadata: {},
    lastSyncedAt: new Date(0).toISOString(),
    lastReviewedAt: new Date(0).toISOString(),
  }),
  getResourceAttributes: jest.fn().mockResolvedValue({
    id: 'res-1',
    tenantId: 'tenant-1',
    residency: 'us',
    classification: 'public',
    tags: [],
  }),
  getDecisionContext: jest.fn().mockReturnValue({
    protectedActions: [],
    requestTime: new Date(0).toISOString(),
    currentAcr: 'loa1',
  }),
  listProtectedActions: jest.fn().mockReturnValue([]),
  invalidateSubject: jest.fn(),
  invalidateResource: jest.fn(),
  getIdpSchema: jest.fn().mockReturnValue({}),
} as unknown as AttributeService;

describe('requireAuth baggage propagation', () => {
  beforeEach(() => {
    jest.mocked(sessionManager.validate).mockResolvedValue({
      payload: { sub: 'alice', sid: 'sid-1', acr: 'loa1' },
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('attaches authorization baggage to downstream handlers', async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.headers.authorization = 'Bearer token';
      next();
    });
    app.use(
      requireAuth(attributeServiceStub, {
        action: 'dataset:read',
        skipAuthorization: true,
      }),
    );
    app.get('/protected', (req, res) => {
      const baggage = propagation.getBaggage(
        (req as AuthenticatedRequest).authorizationContext!,
      );
      res.json({
        subject: baggage?.getEntry('subject.id')?.value,
        tenant: baggage?.getEntry('tenant.id')?.value,
        resource: baggage?.getEntry('resource.id')?.value,
        action: baggage?.getEntry('action.name')?.value,
      });
    });

    const response = await request(app).get('/protected');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      subject: 'alice',
      tenant: 'tenant-1',
      resource: 'res-1',
      action: 'dataset:read',
    });
  });
});
