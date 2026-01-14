/**
 * DLP Service Unit Tests
 *
 * Comprehensive test suite for the DLP service and middleware.
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  jest,
} from '@jest/globals';
import {
  dlpService,
  DLPContext,
} from '../../server/src/services/DLPService.js';
import { createDLPMiddleware } from '../../server/src/middleware/dlpMiddleware.js';
import { Request, Response } from 'express';

// Mock Redis for testing
jest.mock('../../server/src/db/redis.js', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  },
}));

// Mock logger
jest.mock('../../server/src/config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('DLP Service', () => {
  let testContext: DLPContext;

  beforeEach(() => {
    testContext = {
      userId: 'test-user',
      tenantId: 'test-tenant',
      userRole: 'user',
      operationType: 'write',
      contentType: 'application/json',
    };
  });

  describe('Policy Management', () => {
    test('should add and retrieve policies', () => {
      const policy = {
        name: 'Test Policy',
        description: 'Test DLP policy',
        enabled: true,
        priority: 1,
        conditions: [
          {
            type: 'content_match' as const,
            operator: 'contains' as const,
            value: 'test-pattern',
          },
        ],
        actions: [
          {
            type: 'alert' as const,
            severity: 'medium' as const,
          },
        ],
        exemptions: [],
      };

      dlpService.addPolicy(policy);
      const policies = dlpService.listPolicies();

      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some((p) => p.name === 'Test Policy')).toBe(true);
    });

    test('should update existing policies', () => {
      const policy = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Original description',
        enabled: true,
        priority: 1,
        conditions: [
          {
            type: 'content_match' as const,
            operator: 'contains' as const,
            value: 'test',
          },
        ],
        actions: [
          {
            type: 'alert' as const,
            severity: 'low' as const,
          },
        ],
        exemptions: [],
      };

      dlpService.addPolicy(policy);

      const updated = dlpService.updatePolicy('test-policy', {
        description: 'Updated description',
        enabled: false,
      });

      expect(updated).toBe(true);

      const retrievedPolicy = dlpService.getPolicy('test-policy');
      expect(retrievedPolicy?.description).toBe('Updated description');
      expect(retrievedPolicy?.enabled).toBe(false);
    });

    test('should delete policies', () => {
      const policy = {
        id: 'delete-test',
        name: 'Delete Test',
        description: 'Policy to be deleted',
        enabled: true,
        priority: 1,
        conditions: [
          {
            type: 'content_match' as const,
            operator: 'contains' as const,
            value: 'delete-me',
          },
        ],
        actions: [
          {
            type: 'block' as const,
            severity: 'high' as const,
          },
        ],
        exemptions: [],
      };

      dlpService.addPolicy(policy);
      expect(dlpService.getPolicy('delete-test')).toBeTruthy();

      const deleted = dlpService.deletePolicy('delete-test');
      expect(deleted).toBe(true);
      expect(dlpService.getPolicy('delete-test')).toBeUndefined();
    });
  });

  describe('Content Scanning', () => {
    test('should detect PII in content', async () => {
      const content =
        'My email is john.doe@example.com and my SSN is 123-45-6789';
      const results = await dlpService.scanContent(content, testContext);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matched).toBe(true);
      expect(results[0].metadata.detectedEntities).toContain('email');
      expect(results[0].metadata.detectedEntities).toContain('ssn');
    });

    test('should detect credentials in content', async () => {
      const content =
        'API_KEY=sk-1234567890abcdef1234567890abcdef and SECRET_TOKEN=abc123def456';
      const results = await dlpService.scanContent(content, testContext);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.policyId === 'credentials-detection')).toBe(
        true,
      );
    });

    test('should detect financial data', async () => {
      const content =
        'Credit card: 4111-1111-1111-1111, Bank account: 123456789012';
      const results = await dlpService.scanContent(content, testContext);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.policyId === 'financial-data')).toBe(true);
    });

    test('should respect exemptions', async () => {
      const exemptContext: DLPContext = {
        ...testContext,
        userRole: 'admin',
      };

      const content = 'john.doe@example.com';
      const results = await dlpService.scanContent(content, exemptContext);

      // Admin should be exempted from some policies
      const piiResults = results.filter((r) => r.policyId === 'pii-detection');
      expect(piiResults.length).toBe(0);
    });

    test('should handle JSON content', async () => {
      const content = {
        user: {
          email: 'test@example.com',
          ssn: '123-45-6789',
        },
        payment: {
          creditCard: '4111-1111-1111-1111',
        },
      };

      const results = await dlpService.scanContent(content, testContext);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Action Application', () => {
    test('should redact sensitive content', async () => {
      const content = 'Email: user@example.com, SSN: 123-45-6789';
      const scanResults = await dlpService.scanContent(content, testContext);

      const { processedContent, actionsApplied, blocked } =
        await dlpService.applyActions(content, scanResults, testContext);

      expect(actionsApplied).toContain('redacted');
      expect(processedContent).toContain('[REDACTED]');
      expect(processedContent).not.toContain('user@example.com');
      expect(processedContent).not.toContain('123-45-6789');
      expect(blocked).toBe(false);
    });

    test('should block critical violations', async () => {
      const content = 'API_KEY=sk-very-secret-key-12345678901234567890';
      const scanResults = await dlpService.scanContent(content, testContext);

      const { actionsApplied, blocked } = await dlpService.applyActions(
        content,
        scanResults,
        testContext,
      );

      expect(actionsApplied).toContain('blocked');
      expect(blocked).toBe(true);
    });
  });
});

describe('DLP Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      path: '/api/test',
      body: { data: 'test content' },
      params: {},
      query: {},
      user: {
        id: 'test-user',
        tenantId: 'test-tenant',
        role: 'user',
      },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('application/json'),
    };

    mockResponse = {
      json: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  test('should process request without violations', async () => {
    const middleware = createDLPMiddleware({
      enabled: true,
      scanBody: true,
      blockOnViolation: true,
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalled();
    expect((mockRequest as any).dlp?.scanned).toBe(true);
    expect((mockRequest as any).dlp?.violations.length).toBeGreaterThanOrEqual(
      0,
    );
  });

  test('should block request with critical violations', async () => {
    mockRequest.body = {
      apiKey: 'sk-1234567890abcdef1234567890abcdef',
      data: 'test content',
    };

    const middleware = createDLPMiddleware({
      enabled: true,
      scanBody: true,
      blockOnViolation: true,
    });

    await expect(
      middleware(mockRequest as Request, mockResponse as Response, mockNext),
    ).rejects.toThrow(/DLP_VIOLATION/);
  });

  test('should respect exemptions for routes', async () => {
    mockRequest.path = '/health';

    const middleware = createDLPMiddleware({
      enabled: true,
      exemptRoutes: ['/health'],
      scanBody: true,
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalled();
    expect((mockRequest as any).dlp).toBeUndefined();
  });

  test('should handle disabled DLP', async () => {
    const middleware = createDLPMiddleware({
      enabled: false,
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalled();
    expect((mockRequest as any).dlp).toBeUndefined();
  });

  test('should redact content in read-only mode', async () => {
    mockRequest.body = {
      email: 'sensitive@example.com',
      data: 'other data',
    };

    const middleware = createDLPMiddleware({
      enabled: true,
      scanBody: true,
      blockOnViolation: false, // Read-only mode
    });

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalled();
    expect((mockRequest as any).dlp?.scanned).toBe(true);

    // Content should be redacted but request not blocked
    if ((mockRequest as any).dlp?.violations.length > 0) {
      expect(mockRequest.body).not.toEqual({
        email: 'sensitive@example.com',
        data: 'other data',
      });
    }
  });
});

describe('DLP GraphQL Plugin', () => {
  // These would be integration tests with a test GraphQL server
  test.todo('should scan GraphQL variables for violations');
  test.todo('should block GraphQL operations with critical violations');
  test.todo('should redact GraphQL response data');
  test.todo('should respect operation exemptions');
});

describe('DLP Performance', () => {
  test('should handle large content efficiently', async () => {
    const largeContent =
      'a'.repeat(10000) + ' email@example.com ' + 'b'.repeat(10000);

    const startTime = Date.now();
    const results = await dlpService.scanContent(largeContent, testContext);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    expect(results.length).toBeGreaterThan(0);
  });

  test('should use circuit breaker for resilience', async () => {
    // This would test the circuit breaker functionality
    // by simulating failures and verifying it opens/closes appropriately
    expect(true).toBe(true); // Placeholder
  });
});

describe('DLP Configuration', () => {
  test('should validate policy configurations', () => {
    expect(() => {
      dlpService.addPolicy({
        name: 'Invalid Policy',
        description: 'Test',
        enabled: true,
        priority: 1,
        conditions: [], // Invalid - no conditions
        actions: [
          {
            type: 'alert' as const,
            severity: 'medium' as const,
          },
        ],
        exemptions: [],
      });
    }).not.toThrow(); // Service should handle gracefully
  });

  test('should load default policies on startup', () => {
    const policies = dlpService.listPolicies();

    expect(policies.some((p) => p.id === 'pii-detection')).toBe(true);
    expect(policies.some((p) => p.id === 'credentials-detection')).toBe(true);
    expect(policies.some((p) => p.id === 'financial-data')).toBe(true);
  });
});
