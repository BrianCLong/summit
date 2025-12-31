import { describe, it, expect, jest, beforeAll, afterAll, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import bodyParser from 'body-parser';
import { PolicyProfileService } from '../src/services/PolicyProfileService.js';
import { tenantService } from '../src/services/TenantService.js';
import policyProfilesRouter from '../src/routes/policy-profiles.js';
import tenantRouter from '../src/routes/tenants.js';

// Mock dependencies
jest.mock('../src/services/TenantService.js', () => ({
    tenantService: {
        getTenant: jest.fn(),
        updateSettings: jest.fn(),
        disableTenant: jest.fn(),
        getTenantSettings: jest.fn()
    },
    createTenantSchema: { parse: jest.fn() }
}));

jest.mock('../src/services/PolicyProfileService.js', () => {
  const originalModule = jest.requireActual('../src/services/PolicyProfileService.js');
  return {
    ...originalModule,
    policyProfileService: {
      getProfiles: jest.fn(),
      getProfile: jest.fn(),
      applyProfile: jest.fn(),
    },
  };
});

jest.mock('../src/middleware/auth.js', () => ({
    ensureAuthenticated: (req, res, next) => {
        req.user = { id: 'test-user', role: 'ADMIN', tenantId: 'test-tenant' };
        next();
    }
}));

jest.mock('../src/middleware/abac.js', () => ({
    ensurePolicy: () => (req, res, next) => next()
}));

jest.mock('../src/repos/ProvenanceRepo.js');
jest.mock('../src/config/database.js', () => ({
  getPostgresPool: jest.fn()
}));
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: () => 'test-uuid',
  createHash: () => ({ update: () => ({ digest: () => 'hash' }) })
}));

const app = express();
app.use(bodyParser.json());
app.use('/api/tenants', tenantRouter);
app.use('/api/policy-profiles', policyProfilesRouter);

describe('Partner Console Integration', () => {

    describe('GET /api/policy-profiles', () => {
        it('should return a list of profiles', async () => {
            const mockProfiles = [{ id: 'baseline', name: 'Baseline' }];
            (PolicyProfileService.getInstance().getProfiles as jest.Mock).mockReturnValue(mockProfiles);
            (PolicyProfileService.getInstance() as any).getProfiles = jest.fn().mockReturnValue(mockProfiles);
            // Re-mock the imported instance
            (policyProfileService.getProfiles as jest.Mock).mockReturnValue(mockProfiles);

            const res = await request(app).get('/api/policy-profiles');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual(mockProfiles);
        });
    });

    describe('POST /api/tenants/:id/policy-profile', () => {
        it('should apply a policy profile', async () => {
            const tenantId = 'test-tenant';
            const profileId = 'strict';

            (policyProfileService.applyProfile as jest.Mock).mockResolvedValue(undefined);

            const res = await request(app)
                .post(`/api/tenants/${tenantId}/policy-profile`)
                .send({ profileId });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.receipt).toBeDefined();
            expect(policyProfileService.applyProfile).toHaveBeenCalledWith(tenantId, profileId, 'test-user');
        });

        it('should return 404 if tenant not found', async () => {
             (policyProfileService.applyProfile as jest.Mock).mockRejectedValue(new Error('Tenant not found'));

             const res = await request(app)
                .post(`/api/tenants/missing/policy-profile`)
                .send({ profileId: 'strict' });

            expect(res.status).toBe(404);
        });
    });
});
