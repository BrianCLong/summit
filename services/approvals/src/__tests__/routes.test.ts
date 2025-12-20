import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the dependencies before importing the router
vi.mock('../db/database.js', () => ({
  db: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    query: vi.fn(),
    isHealthy: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/opa-client.js', () => ({
  opaClient: {
    evaluateApprovalRequest: vi.fn(),
    evaluateDecision: vi.fn(),
    isHealthy: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/provenance-client.js', () => ({
  provenanceClient: {
    createReceipt: vi.fn(),
    isHealthy: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/approval-service.js', () => ({
  approvalService: {
    createRequest: vi.fn(),
    getRequest: vi.fn(),
    listRequests: vi.fn(),
    submitDecision: vi.fn(),
    cancelRequest: vi.fn(),
  },
}));

import approvalsRouter from '../routes/approvals.js';
import healthRouter from '../routes/health.js';
import { approvalService } from '../services/approval-service.js';

describe('Approvals API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', approvalsRouter);
    app.use('/health', healthRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/v1/requests', () => {
    const validRequest = {
      resource: { type: 'deployment', id: 'deploy-123' },
      action: 'deploy',
      requestor: { id: 'user-123', roles: ['developer'] },
    };

    it('should return 400 when X-Tenant-ID is missing', async () => {
      const response = await request(app)
        .post('/api/v1/requests')
        .send(validRequest);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_TENANT_ID');
    });

    it('should create a request with valid input', async () => {
      const mockRequest = {
        id: 'req-123',
        tenant_id: 'tenant-1',
        ...validRequest,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(approvalService.createRequest).mockResolvedValue(mockRequest as any);

      const response = await request(app)
        .post('/api/v1/requests')
        .set('X-Tenant-ID', 'tenant-1')
        .send(validRequest);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('req-123');
      expect(approvalService.createRequest).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining(validRequest),
        undefined,
      );
    });

    it('should pass idempotency key to service', async () => {
      const mockRequest = {
        id: 'req-123',
        tenant_id: 'tenant-1',
        ...validRequest,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(approvalService.createRequest).mockResolvedValue(mockRequest as any);

      await request(app)
        .post('/api/v1/requests')
        .set('X-Tenant-ID', 'tenant-1')
        .set('X-Idempotency-Key', 'idem-123')
        .send(validRequest);

      expect(approvalService.createRequest).toHaveBeenCalledWith(
        'tenant-1',
        expect.any(Object),
        'idem-123',
      );
    });

    it('should return 422 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/v1/requests')
        .set('X-Tenant-ID', 'tenant-1')
        .send({ action: 'deploy' }); // Missing required fields

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/requests', () => {
    it('should list requests with pagination', async () => {
      const mockResponse = {
        items: [],
        pagination: { total: 0, limit: 20, has_more: false },
      };

      vi.mocked(approvalService.listRequests).mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/v1/requests')
        .set('X-Tenant-ID', 'tenant-1');

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
      expect(response.body.pagination).toBeDefined();
    });

    it('should pass query parameters to service', async () => {
      const mockResponse = {
        items: [],
        pagination: { total: 0, limit: 10, has_more: false },
      };

      vi.mocked(approvalService.listRequests).mockResolvedValue(mockResponse);

      await request(app)
        .get('/api/v1/requests?status=pending&limit=10')
        .set('X-Tenant-ID', 'tenant-1');

      expect(approvalService.listRequests).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          status: ['pending'],
          limit: 10,
        }),
      );
    });
  });

  describe('GET /api/v1/requests/:requestId', () => {
    it('should return request by ID', async () => {
      const mockRequest = {
        id: 'req-123',
        tenant_id: 'tenant-1',
        status: 'pending',
      };

      vi.mocked(approvalService.getRequest).mockResolvedValue(mockRequest as any);

      const response = await request(app)
        .get('/api/v1/requests/req-123')
        .set('X-Tenant-ID', 'tenant-1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('req-123');
    });

    it('should return 404 for non-existent request', async () => {
      vi.mocked(approvalService.getRequest).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/requests/non-existent')
        .set('X-Tenant-ID', 'tenant-1');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/requests/:requestId/decision', () => {
    const validDecision = {
      decision: 'approve',
      actor: { id: 'approver-123', roles: ['admin'] },
      reason: 'Looks good',
    };

    it('should submit a decision', async () => {
      const mockRequest = {
        id: 'req-123',
        tenant_id: 'tenant-1',
        status: 'approved',
      };

      vi.mocked(approvalService.submitDecision).mockResolvedValue(mockRequest as any);

      const response = await request(app)
        .post('/api/v1/requests/req-123/decision')
        .set('X-Tenant-ID', 'tenant-1')
        .send(validDecision);

      expect(response.status).toBe(200);
      expect(approvalService.submitDecision).toHaveBeenCalledWith(
        'tenant-1',
        'req-123',
        expect.objectContaining(validDecision),
      );
    });
  });

  describe('POST /api/v1/requests/:requestId/cancel', () => {
    it('should cancel a request', async () => {
      const mockRequest = {
        id: 'req-123',
        tenant_id: 'tenant-1',
        status: 'cancelled',
      };

      vi.mocked(approvalService.cancelRequest).mockResolvedValue(mockRequest as any);

      const response = await request(app)
        .post('/api/v1/requests/req-123/cancel')
        .set('X-Tenant-ID', 'tenant-1')
        .send({
          actor: { id: 'user-123', roles: ['developer'] },
          reason: 'No longer needed',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
    });
  });
});

describe('Health Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRouter);
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready when all checks pass', async () => {
      const response = await request(app).get('/health/ready');
      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });
  });

  describe('GET /health/live', () => {
    it('should return live', async () => {
      const response = await request(app).get('/health/live');
      expect(response.status).toBe(200);
      expect(response.body.live).toBe(true);
    });
  });
});
