// @ts-nocheck
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import partnerRouter from '../partners.js';
import { apiKeyService } from '../../services/ApiKeyService.js';
import { partnerService } from '../../services/PartnerService.js';

// Mock Dependencies
jest.mock('../../services/ApiKeyService.js');
jest.mock('../../services/PartnerService.js');
jest.mock('../../observability/index.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  metrics: {
    increment: jest.fn(),
  },
}));
jest.mock('../../db/pg.js', () => ({
  pg: {
    oneOrNone: jest.fn(),
    manyOrNone: jest.fn(),
    one: jest.fn(),
    none: jest.fn(),
  },
}));

const app = express();
app.use(express.json());
// Mock auth middleware
app.use((req: any, res, next) => {
    req.user = { id: 'test-user', tenantId: 'test-tenant' };
    next();
});
app.use('/api/partners', partnerRouter);

describe('Partner Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/partners/onboard', () => {
        it('should onboard a new partner successfully', async () => {
            const mockInput = {
                name: 'Test Agency',
                slug: 'test-agency',
                region: 'US',
                contactEmail: 'contact@agency.com',
                partnerType: 'agency'
            };

            const mockResult = {
                id: 'new-tenant-id',
                name: 'Test Agency',
                status: 'pending_approval'
            };

            (partnerService.registerPartner as jest.Mock).mockResolvedValue(mockResult);

            const res = await request(app)
                .post('/api/partners/onboard')
                .send(mockInput);

            expect(res.status).toBe(201);
            expect(res.body).toEqual(mockResult);
            expect(partnerService.registerPartner).toHaveBeenCalledWith(mockInput, 'test-user');
        });

        it('should validate input', async () => {
             const res = await request(app)
                .post('/api/partners/onboard')
                .send({ name: 'Short' }); // Missing required fields

             expect(res.status).toBe(400);
        });
    });

    describe('POST /api/partners/keys', () => {
        it('should create an API key', async () => {
            const mockResult = {
                apiKey: { id: 'key-id', prefix: 'sk_live_...' },
                token: 'sk_live_12345'
            };

            (apiKeyService.createApiKey as jest.Mock).mockResolvedValue(mockResult);

            const res = await request(app)
                .post('/api/partners/keys')
                .send({ name: 'Test Key', scopes: ['read:cases'] });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(mockResult);
            expect(apiKeyService.createApiKey).toHaveBeenCalledWith({
                tenantId: 'test-tenant',
                name: 'Test Key',
                scopes: ['read:cases'],
                createdBy: 'test-user'
            });
        });
    });

    describe('GET /api/partners/keys', () => {
        it('should list API keys', async () => {
            const mockKeys = [{ id: 'key-1' }, { id: 'key-2' }];
            (apiKeyService.listApiKeys as jest.Mock).mockResolvedValue(mockKeys);

            const res = await request(app).get('/api/partners/keys');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockKeys);
        });
    });

    // Note: Testing /api/partners/exchange/cases requires headers modification which supertest handles,
    // but our route uses a custom middleware `requireApiKey`.
    // We need to mock `apiKeyService.validateApiKey` for this.

    describe('POST /api/partners/exchange/cases', () => {
        it('should exchange case data with valid API key', async () => {
             const mockApiKey = {
                 id: 'key-id',
                 tenant_id: 'source-tenant',
                 scopes: ['exchange:all']
             };

             (apiKeyService.validateApiKey as jest.Mock).mockResolvedValue(mockApiKey);
             (partnerService.shareCase as jest.Mock).mockResolvedValue({ success: true, transferId: '123' });

             const res = await request(app)
                 .post('/api/partners/exchange/cases')
                 .set('X-API-Key', 'sk_live_valid')
                 .send({
                     targetPartner: 'target-agency',
                     caseData: { id: 'case-1' }
                 });

             expect(res.status).toBe(200);
             expect(res.body).toEqual({ success: true, transferId: '123' });
             expect(apiKeyService.validateApiKey).toHaveBeenCalledWith('sk_live_valid');
             expect(partnerService.shareCase).toHaveBeenCalledWith('source-tenant', 'target-agency', { id: 'case-1' });
        });

        it('should reject without API Key', async () => {
            const res = await request(app)
                .post('/api/partners/exchange/cases')
                .send({ targetPartner: 'target', caseData: {} });

            expect(res.status).toBe(401);
        });

        it('should reject invalid API Key', async () => {
            (apiKeyService.validateApiKey as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .post('/api/partners/exchange/cases')
                .set('X-API-Key', 'invalid')
                .send({ targetPartner: 'target', caseData: {} });

            expect(res.status).toBe(403);
        });
    });
});
