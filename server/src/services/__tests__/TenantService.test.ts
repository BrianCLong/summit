import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import type { TenantService as TenantServiceType } from '../TenantService.js';
import { randomUUID } from 'crypto';

// Mock functions declared before mocks
const mockGetPostgresPool = jest.fn();
const mockAppendEntry = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: mockGetPostgresPool,
}));

jest.unstable_mockModule('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: mockAppendEntry,
  },
}));

jest.unstable_mockModule('../../utils/logger.js', () => {
  const logger = {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: mockLoggerDebug,
  };
  return {
    __esModule: true,
    default: logger,
    logger,
  };
});

// Dynamic imports AFTER mocks are set up
const { TenantService } = await import('../TenantService.js');
const GAEnrollmentService = (await import('../GAEnrollmentService.js')).default;
const { provenanceLedger } = await import('../../provenance/ledger.js');

describe('TenantService', () => {
  let tenantService: TenantServiceType;
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest
      .spyOn(GAEnrollmentService, 'checkTenantEnrollmentEligibility')
      .mockResolvedValue({ eligible: true, reason: 'ok' });

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        query: jest.fn()
    };

    mockGetPostgresPool.mockReturnValue(mockPool);

    tenantService = TenantService.getInstance();
  });

  describe('createTenant', () => {
    const validInput = {
      name: 'Test Corp',
      slug: 'test-corp',
      residency: 'US' as const,
    };
    const actorId = 'user-123';

    it('should create a tenant successfully and associate user', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 0, rows: [] });

      // Mock insertion return
      const mockTenantRow = {
        id: randomUUID(),
        name: validInput.name,
        slug: validInput.slug,
        residency: validInput.residency,
        tier: 'starter',
        status: 'active',
        config: {},
        settings: {},
        created_by: actorId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockClient.query
        .mockResolvedValueOnce(undefined as any) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // SELECT slug
        .mockResolvedValueOnce({ rows: [mockTenantRow] }) // INSERT tenant
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE user

      const result = await tenantService.createTenant(validInput, actorId);

      expect(result).toBeDefined();
      expect(result.slug).toBe(validInput.slug);
      expect(result.residency).toBe(validInput.residency);

      // Verify User was updated
      expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE users'),
          expect.arrayContaining([expect.any(String), 'ADMIN', actorId])
      );

      // Verify Provenance Ledger was called
      expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
          action: 'TENANT_CREATED',
          actor: expect.objectContaining({ id: actorId })
      }));
    });

    it('should return existing tenant if created by same user (idempotency)', async () => {
        const existingTenantRow = {
            id: randomUUID(),
            name: validInput.name,
            slug: validInput.slug,
            residency: validInput.residency,
            tier: 'starter',
            created_by: actorId,
            status: 'active',
            config: {},
            settings: {},
            created_at: new Date(),
            updated_at: new Date()
        };

        mockClient.query.mockResolvedValue({ rowCount: 0, rows: [] });
        mockClient.query
          .mockResolvedValueOnce(undefined as any) // BEGIN
          .mockResolvedValueOnce({ rowCount: 1, rows: [existingTenantRow] }); // SELECT slug

        const result = await tenantService.createTenant(validInput, actorId);

        expect(result.id).toBe(existingTenantRow.id);
        // Should rollback the transaction since it returned early
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        // Should NOT have called INSERT
        expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO tenants'));
    });

    it('should throw error if slug is already taken by another user', async () => {
      const otherUserRow = {
          ...validInput,
          created_by: 'other-user',
          id: randomUUID(),
          config: {},
          settings: {}
      };
      mockClient.query.mockResolvedValue({ rowCount: 0, rows: [] });
      mockClient.query
        .mockResolvedValueOnce(undefined as any) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [otherUserRow] }); // SELECT slug

      await expect(tenantService.createTenant(validInput, actorId))
        .rejects.toThrow("Tenant slug 'test-corp' is already taken");
    });
  });
});
