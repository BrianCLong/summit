import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxEnforcer, OperationType } from '../enforcement/SandboxEnforcer.js';
import { SandboxConfigManager } from '../config/SandboxConfigManager.js';
import {
  SandboxTenantProfile,
  SandboxIsolationLevel,
  SandboxStatus,
  DataAccessMode,
  ConnectorType,
  SandboxErrorCode,
} from '../types/index.js';

describe('SandboxEnforcer', () => {
  let enforcer: SandboxEnforcer;
  let configManager: SandboxConfigManager;
  let testProfile: SandboxTenantProfile;
  const testUserId = 'user-123';
  const testOwnerId = 'owner-456';

  beforeEach(async () => {
    enforcer = new SandboxEnforcer();
    configManager = new SandboxConfigManager();

    testProfile = await configManager.createProfile(
      {
        name: 'Test Sandbox',
        expiresInDays: 30,
      },
      testOwnerId
    );

    // Activate the profile for testing
    testProfile = await configManager.activateProfile(testProfile.id);
  });

  describe('enforce', () => {
    it('should allow queries with filters', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.QUERY,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.filters).toBeDefined();
      expect(decision.filters?.length).toBeGreaterThan(0);
    });

    it('should allow mutations within sandbox', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.MUTATION,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.warnings).toContain('Mutations only affect sandbox data');
    });

    it('should block federation operations', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.FEDERATION,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.FEDERATION_BLOCKED);
    });

    it('should block operations on suspended sandbox', async () => {
      const suspendedProfile = await configManager.suspendProfile(
        testProfile.id,
        'Security review'
      );

      const decision = await enforcer.enforce(suspendedProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.QUERY,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.SUSPENDED);
    });

    it('should block operations on expired sandbox', async () => {
      testProfile.expiresAt = new Date('2020-01-01');

      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.QUERY,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.EXPIRED);
    });
  });

  describe('enforceExport', () => {
    it('should block exports when disabled', async () => {
      // Default profile has exports disabled
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.EXPORT,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.EXPORT_BLOCKED);
    });

    it('should allow exports when enabled and within quota', async () => {
      testProfile.resourceQuotas.maxDataExportMb = 100;
      testProfile.integrationRestrictions.allowExternalExports = true;

      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.EXPORT,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.warnings).toContain('Export limited to 100MB');
    });
  });

  describe('enforceConnector', () => {
    it('should allow database connector by default', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.DATABASE,
        targetEndpoint: 'sandbox-db',
      });

      expect(decision.allowed).toBe(true);
    });

    it('should block federation connector', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.FEDERATION,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.CONNECTOR_BLOCKED);
    });

    it('should respect blocklist patterns', async () => {
      // Find API connector and add blocklist
      const apiConnector = testProfile.connectorRestrictions.find(
        c => c.connectorType === ConnectorType.API
      );
      if (apiConnector) {
        apiConnector.blocklist = ['production-*'];
      }

      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.API,
        targetEndpoint: 'production-api',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.CONNECTOR_BLOCKED);
    });

    it('should require connector type to be specified', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.CONNECTOR_BLOCKED);
    });
  });

  describe('enforceDataAccess', () => {
    it('should detect and block PII fields when configured', async () => {
      testProfile.dataAccessPolicy.piiHandling = 'block';

      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.DATA_ACCESS,
        dataFields: ['name', 'ssn', 'email', 'address'],
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.PII_DETECTED);
    });

    it('should warn about PII when redacting', async () => {
      testProfile.dataAccessPolicy.piiHandling = 'redact';

      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.DATA_ACCESS,
        dataFields: ['name', 'ssn', 'status'],
      });

      expect(decision.allowed).toBe(true);
      expect(decision.warnings.some(w => w.includes('PII'))).toBe(true);
    });

    it('should allow data access without PII fields', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.DATA_ACCESS,
        dataFields: ['id', 'name', 'status', 'createdAt'],
      });

      expect(decision.allowed).toBe(true);
    });
  });

  describe('checkLinkback', () => {
    it('should always block linkback attempts', async () => {
      const decision = await enforcer.checkLinkback(
        testProfile,
        {
          sandboxId: testProfile.id,
          userId: testUserId,
          operation: OperationType.DATA_ACCESS,
          resourceId: 'entity-123',
        },
        'prod_entity-456'
      );

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.LINKBACK_BLOCKED);
    });

    it('should record linkback attempts', async () => {
      await enforcer.checkLinkback(
        testProfile,
        {
          sandboxId: testProfile.id,
          userId: testUserId,
          operation: OperationType.DATA_ACCESS,
          resourceId: 'entity-123',
        },
        'prod_entity-456'
      );

      const attempts = enforcer.getLinkbackAttempts(testProfile.id);
      expect(attempts).toHaveLength(1);
      expect(attempts[0].blocked).toBe(true);
      expect(attempts[0].userId).toBe(testUserId);
    });
  });

  describe('getDataFilters', () => {
    it('should include tenant filter', () => {
      const filters = enforcer.getDataFilters(testProfile);

      const tenantFilter = filters.find(f => f.field === 'tenantId');
      expect(tenantFilter).toBeDefined();
      expect(tenantFilter?.value).toBe(testProfile.id);
    });

    it('should filter production sources', () => {
      const filters = enforcer.getDataFilters(testProfile);

      const sourceFilter = filters.find(f => f.field === 'sourceType');
      expect(sourceFilter).toBeDefined();
      expect(sourceFilter?.operator).toBe('ne');
      expect(sourceFilter?.value).toBe('production');
    });

    it('should apply entity type filters', () => {
      testProfile.dataAccessPolicy.allowedEntityTypes = ['Person', 'Organization'];

      const filters = enforcer.getDataFilters(testProfile);

      const entityTypeFilter = filters.find(f => f.field === 'entityType');
      expect(entityTypeFilter).toBeDefined();
      expect(entityTypeFilter?.operator).toBe('in');
      expect(entityTypeFilter?.value).toEqual(['Person', 'Organization']);
    });

    it('should filter for synthetic data only when configured', () => {
      testProfile.dataAccessPolicy.mode = DataAccessMode.SYNTHETIC_ONLY;

      const filters = enforcer.getDataFilters(testProfile);

      const sourceFilter = filters.find(f => f.field === 'dataSource');
      expect(sourceFilter).toBeDefined();
      expect(sourceFilter?.value).toBe('synthetic');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      testProfile.resourceQuotas.maxExecutionsPerHour = 3;

      // Execute up to the limit
      for (let i = 0; i < 3; i++) {
        const decision = await enforcer.enforce(testProfile, {
          sandboxId: testProfile.id,
          userId: testUserId,
          operation: OperationType.QUERY,
        });
        expect(decision.allowed).toBe(true);
      }

      // Next should be blocked
      const blockedDecision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.QUERY,
      });

      expect(blockedDecision.allowed).toBe(false);
      expect(blockedDecision.code).toBe(SandboxErrorCode.QUOTA_EXCEEDED);
    });
  });

  describe('airgapped isolation', () => {
    beforeEach(async () => {
      testProfile = await configManager.createProfile(
        {
          name: 'Airgapped Sandbox',
          isolationLevel: SandboxIsolationLevel.AIRGAPPED,
          expiresInDays: 7,
        },
        testOwnerId
      );
      testProfile = await configManager.activateProfile(testProfile.id);
    });

    it('should block API connector in airgapped mode', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.API,
        targetEndpoint: 'any-api',
      });

      expect(decision.allowed).toBe(false);
    });

    it('should block external service connector', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.EXTERNAL_SERVICE,
      });

      expect(decision.allowed).toBe(false);
    });

    it('should allow local database connector', async () => {
      const decision = await enforcer.enforce(testProfile, {
        sandboxId: testProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.DATABASE,
        targetEndpoint: 'sandbox-db',
      });

      expect(decision.allowed).toBe(true);
    });
  });
});
