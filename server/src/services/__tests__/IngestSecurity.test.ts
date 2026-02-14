
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mocks
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

const mockCorrelationStorage = {
  getStore: jest.fn(),
  run: jest.fn((store: any, callback: any) => callback()),
};

// Use unstable_mockModule for ESM mocks

// Mock Logger
await jest.unstable_mockModule('../../config/logger.js', () => ({
  default: mockLogger,
  logger: mockLogger,
  correlationStorage: mockCorrelationStorage,
}));

// Mock IngestService - Initial setup (will be reset by jest config)
await jest.unstable_mockModule('../IngestService.js', () => ({
  IngestService: jest.fn(),
}));

// Mock OPA
await jest.unstable_mockModule('../opa-client.js', () => ({
  verifyTenantAccess: jest.fn().mockResolvedValue(true),
}));

// Mock Middleware
await jest.unstable_mockModule('../../middleware/require-tenant-context.js', () => ({
  requireTenantContextMiddleware: () => (req: any, res: any, next: any) => {
    req.tenant = {
        tenantId: 'test-tenant',
        environment: 'dev',
        privilegeTier: 'standard'
    };
    next();
  },
}));

// Mock Security Audit
await jest.unstable_mockModule('../../audit/security-audit-logger.js', () => ({
  securityAudit: {
    logDataImport: jest.fn(),
  },
}));

// Mock DB Tenant
await jest.unstable_mockModule('../../db/tenant.js', () => ({
  queryWithTenantContext: jest.fn(),
}));

// Mock dependencies of TenantIsolationGuard
await jest.unstable_mockModule('../RateLimiter.js', () => ({
  rateLimiter: {
      checkLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 100, reset: 0, total: 100 }),
  },
}));
await jest.unstable_mockModule('../../tenancy/killSwitch.js', () => ({
  tenantKillSwitch: {
      hasConfig: () => true,
      isDisabled: () => false,
  },
}));

// Import TenantIsolationGuard
const { tenantIsolationGuard } = await import('../../tenancy/TenantIsolationGuard.js');

// Import IngestService to configure it
const { IngestService } = await import('../IngestService.js');

// Import the router
const { ingestRouter } = await import('../../routes/ingest.js');

describe('Ingest API Security Logging', () => {
  let app: express.Application;

  beforeEach(() => {
    // Re-configure IngestService mock because 'resetMocks: true' clears it
    (IngestService as unknown as jest.Mock).mockImplementation(() => ({
        ingest: jest.fn().mockRejectedValue(new Error('Simulated Ingest Error'))
    }));

    // Re-apply spies on TenantIsolationGuard (if they were reset/restored)
    // Note: jest.restoreAllMocks() in config might have removed them if we used spyOn.
    // But here we are setting them up fresh.
    jest.spyOn(tenantIsolationGuard, 'evaluatePolicy').mockReturnValue({ allowed: true });
    jest.spyOn(tenantIsolationGuard, 'enforceIngestionCap').mockResolvedValue({
        allowed: true, limit: 1000, reset: Date.now() + 10000, status: 200
    } as any);
    jest.spyOn(tenantIsolationGuard, 'enforceStorageQuota').mockResolvedValue({
        allowed: true, limit: 1000000, projected: 100, status: 200
    } as any);

    app = express();
    app.use(express.json());
    // Mock user
    app.use((req: any, res, next) => {
      req.user = { id: 'test-user', tenantId: 'test-tenant' };
      next();
    });
    app.use(ingestRouter);
  });

  it('should NOT log sensitive data in request body on error', async () => {
    const sensitiveData = {
      tenantId: 'test-tenant',
      sourceType: 'API',
      sourceId: 'src-123',
      entities: [
        {
          kind: 'User',
          labels: ['Person'],
          properties: {
            email: 'test-user@example.com', // SENSITIVE (Mocked safe value)
            password: 'supersecretpassword', // SENSITIVE
            ssn: '000-00-0000', // SENSITIVE
          },
        },
      ],
    };

    // Act
    const response = await request(app)
      .post('/api/v1/ingest')
      .send(sensitiveData);

    // Debugging
    if (response.status !== 500) {
        console.log('Response Status:', response.status);
        console.log('Response Body:', response.body);
    }

    // Assert
    expect(response.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalled();

    const logCall = mockLogger.error.mock.calls[0];
    const logPayload = logCall[0] as any;

    expect(logPayload.error).toBe('Simulated Ingest Error');

    // CRITICAL SECURITY CHECK
    const logString = JSON.stringify(logPayload);
    // This expects failure if full body is logged.
    expect(logString).not.toContain('test-user@example.com');
    expect(logString).not.toContain('supersecretpassword');
  });
});
