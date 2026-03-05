import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { randomUUID } from 'crypto';

const getPostgresPoolMock = jest.fn();
const checkTenantEnrollmentEligibilityMock = jest.fn();
const appendEntryMock = jest.fn();

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: getPostgresPoolMock,
}));

jest.unstable_mockModule('../GAEnrollmentService.js', () => ({
  default: {
    checkTenantEnrollmentEligibility: checkTenantEnrollmentEligibilityMock,
  },
}));

jest.unstable_mockModule('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: appendEntryMock,
  },
}));

describe('TenantService', () => {
  let TenantService: any;
  let tenantService: any;
  let mockClient: any;
  let mockPool: any;

  beforeAll(async () => {
    ({ TenantService } = await import('../TenantService.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    };

    getPostgresPoolMock.mockReturnValue(mockPool);
    checkTenantEnrollmentEligibilityMock.mockResolvedValue({
      eligible: true,
      reason: 'ok',
    });
    appendEntryMock.mockResolvedValue({ id: 'prov-entry' });

    (TenantService as any).instance = null;
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
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // UPDATE user
        .mockResolvedValueOnce(undefined as any); // COMMIT

      const result = await tenantService.createTenant(validInput, actorId);

      expect(result).toBeDefined();
      expect(result.slug).toBe(validInput.slug);
      expect(result.residency).toBe(validInput.residency);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([expect.any(String), 'ADMIN', actorId]),
      );
      expect(appendEntryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_CREATED',
          actor: expect.objectContaining({ id: actorId }),
        }),
      );
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
        updated_at: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce(undefined as any) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [existingTenantRow] }) // SELECT slug
        .mockResolvedValueOnce(undefined as any); // ROLLBACK

      const result = await tenantService.createTenant(validInput, actorId);

      expect(result.id).toBe(existingTenantRow.id);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenants'),
      );
    });

    it('should throw error if slug is already taken by another user', async () => {
      const otherUserRow = {
        ...validInput,
        created_by: 'other-user',
        id: randomUUID(),
        config: {},
        settings: {},
        tier: 'starter',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce(undefined as any) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [otherUserRow] }); // SELECT slug

      await expect(tenantService.createTenant(validInput, actorId)).rejects.toThrow(
        "Tenant slug 'test-corp' is already taken",
      );
    });
  });
});
