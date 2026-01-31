import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../middleware/auth', () => ({
  ensureAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers['x-test-user-role']) {
      (req as any).user = { role: req.headers['x-test-user-role'] };
    }
    next();
  },
  ensureRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (user && roles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  },
  requirePermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (user && (user.role === 'ADMIN' || user.role === 'ANALYST')) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  },
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers['x-test-user-role']) {
      (req as any).user = { role: req.headers['x-test-user-role'] };
    }
    next();
  },
  auth: (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers['x-test-user-role']) {
      (req as any).user = { role: req.headers['x-test-user-role'] };
    }
    next();
  },
}));

jest.unstable_mockModule('../../provenance/ledger.js', () => ({
  ProvenanceLedgerV2: class {
    static getInstance() {
      return {
        appendEntry: jest.fn().mockResolvedValue({}),
      };
    }
  },
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue({}),
  },
}));

jest.unstable_mockModule('../../middleware/audit-first.js', () => ({
  auditFirstMiddleware: (req: Request, res: Response, next: NextFunction) => next(),
}));

jest.unstable_mockModule('../../compliance/frameworks/HIPAAControls.js', () => ({
  ALL_HIPAA_CONTROLS: [],
  HIPAA_FRAMEWORK: {},
  PHI_IDENTIFIERS: [],
  createHIPAAComplianceService: jest.fn().mockReturnValue({
    getAssessmentHistory: jest.fn().mockResolvedValue([]),
    getAssessment: jest.fn().mockResolvedValue({}),
    performAssessment: jest.fn().mockResolvedValue({ summary: {} }),
    recordEvidence: jest.fn().mockResolvedValue({}),
  }),
}));

jest.unstable_mockModule('../../compliance/frameworks/SOXControls.js', () => ({
  ALL_SOX_CONTROLS: [],
  SOX_FRAMEWORK: {},
  ITGC_DOMAINS: [],
  createSOXComplianceService: jest.fn().mockReturnValue({
    getAssessmentHistory: jest.fn().mockResolvedValue([]),
    getAssessment: jest.fn().mockResolvedValue({}),
    performAssessment: jest.fn().mockResolvedValue({ summary: {} }),
    generateSOC2Packet: jest.fn().mockResolvedValue({
        auditPeriod: { start: '2025-01-01', end: '2025-12-31' },
        controls: { 'CC6.1': {}, 'CC7.1': {}, 'CC8.1': {} }
    }),
    recordEvidence: jest.fn().mockResolvedValue({}),
  }),
}));

jest.unstable_mockModule('../../middleware/rbac.js', () => ({
  requirePermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    // Allow if admin or analyst (for testing purposes) or if no user check intended by this mock (it just passes through if user exists)
    // The previous mock logic for auth.ts requirePermission was:
    // if (user && (user.role === 'ADMIN' || user.role === 'ANALYST'))
    
    // Let's replicate strictness or looseness as needed. 
    // The tests set 'x-test-user-role'.
    // If no user, auth middleware usually handles it.
    
    if (user && (user.role === 'ADMIN' || user.role === 'ANALYST')) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  },
  requireRole: (role: string) => (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (user && user.role === role) {
          next();
      } else {
          res.status(403).json({ error: 'Forbidden' });
      }
  }
}));

// Dynamic imports AFTER mocks are set up
const { createApp } = await import('../../app.js');

let app: express.Application;

const mockAdminUser = {
  user: {
    id: 'admin-user-id',
    role: 'ADMIN',
  },
};

const mockNonAdminUser = {
    user: {
        id: 'analyst-user-id',
        role: 'ANALYST',
    },
};

beforeAll(async () => {
  app = await createApp();
});

describeIf('GET /api/compliance/soc2-packet', () => {
  const startDate = '2025-01-01T00:00:00.000Z';
  const endDate = '2025-12-31T23:59:59.999Z';

  it('should return a 200 OK with a valid JSON SOC2 packet for an ADMIN user', async () => {
    const response = await request(app)
      .get('/api/compliance/soc2-packet')
      .set('x-test-user-role', 'ADMIN')
      .query({ startDate, endDate });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('auditPeriod');
    expect(response.body).toHaveProperty('controls');
    expect(response.headers).toHaveProperty('x-evidence-signature');
    expect(Object.keys(response.body.controls)).toEqual(
      expect.arrayContaining(['CC6.1', 'CC7.1', 'CC8.1'])
    );
  });

  it('should return a 200 OK with a valid PDF SOC2 packet', async () => {
    const response = await request(app)
      .get('/api/compliance/soc2-packet')
      .set('x-test-user-role', 'ADMIN')
      .query({ startDate, endDate, format: 'pdf' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers).toHaveProperty('x-evidence-signature');
  });

  it('should return a 403 Forbidden for a non-admin user', async () => {
    const response = await request(app)
        .get('/api/compliance/soc2-packet')
        .set('x-test-user-role', 'ANALYST')
        .query({ startDate, endDate });

    expect(response.status).toBe(403);
  });

  it('should return a 400 Bad Request if startDate is missing', async () => {
    const endDate = '2025-12-31T23:59:59.999Z';

    const response = await request(app)
      .get('/api/compliance/soc2-packet')
      .query({ endDate });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('startDate and endDate query parameters are required.');
  });

  it('should return a 400 Bad Request if endDate is missing', async () => {
    const startDate = '2025-01-01T00:00:00.000Z';

    const response = await request(app)
      .get('/api/compliance/soc2-packet')
      .query({ startDate });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('startDate and endDate query parameters are required.');
  });

  it('should return a 400 Bad Request for invalid date formats', async () => {
    const startDate = 'not-a-date';
    const endDate = '2025-12-31';

    const response = await request(app)
      .get('/api/compliance/soc2-packet')
      .query({ startDate, endDate });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid date format. Please use ISO 8061 format.');
  });

  // Note: A test for the authorization middleware would go here.
  // Since I cannot implement the actual auth, this is a placeholder.
  it.todo('should return a 403 Forbidden if the user is not a compliance-officer');
});
