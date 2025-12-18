import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  SandboxConfigManager,
  SandboxEnforcer,
  SandboxTenantProfile,
  SandboxIsolationLevel,
  SandboxStatus,
  DataAccessMode,
  OperationType,
  ConnectorType,
  SandboxErrorCode,
} from '@intelgraph/sandbox-tenant-profile';
import { DataCloneService } from '../../data/DataCloneService.js';
import { DataLabAPI } from '../../api/DataLabAPI.js';
import { CloneStrategy, DataSourceType } from '../../types/index.js';

describe('Data Isolation Integration Tests', () => {
  let configManager: SandboxConfigManager;
  let enforcer: SandboxEnforcer;
  let cloneService: DataCloneService;
  let dataLabAPI: DataLabAPI;
  let sandboxProfile: SandboxTenantProfile;
  const testUserId = 'test-user-123';
  const testOwnerId = 'owner-456';

  beforeEach(async () => {
    configManager = new SandboxConfigManager();
    enforcer = new SandboxEnforcer();
    cloneService = new DataCloneService();
    dataLabAPI = new DataLabAPI();

    // Create a test sandbox profile
    sandboxProfile = await configManager.createProfile(
      {
        name: 'Integration Test Sandbox',
        description: 'Sandbox for data isolation testing',
        expiresInDays: 1,
      },
      testOwnerId
    );

    sandboxProfile = await configManager.activateProfile(sandboxProfile.id);
  });

  afterEach(() => {
    // Cleanup
    enforcer.clearLinkbackAttempts(sandboxProfile.id);
  });

  describe('Tenant Isolation', () => {
    it('should enforce tenant scoping on all queries', async () => {
      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.QUERY,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.filters).toBeDefined();

      // Verify tenant filter is present
      const tenantFilter = decision.filters?.find(f => f.field === 'tenantId');
      expect(tenantFilter).toBeDefined();
      expect(tenantFilter?.value).toBe(sandboxProfile.id);
    });

    it('should add production source filter', async () => {
      const filters = enforcer.getDataFilters(sandboxProfile);

      const sourceFilter = filters.find(f => f.field === 'sourceType');
      expect(sourceFilter).toBeDefined();
      expect(sourceFilter?.operator).toBe('ne');
      expect(sourceFilter?.value).toBe('production');
    });

    it('should prevent cross-tenant mutations', async () => {
      // Mutation should only affect sandbox data
      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.MUTATION,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.warnings).toContain('Mutations only affect sandbox data');
    });
  });

  describe('Federation Blocking', () => {
    it('should block all federation operations', async () => {
      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.FEDERATION,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.FEDERATION_BLOCKED);
    });

    it('should block federation connector usage', async () => {
      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.FEDERATION,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.CONNECTOR_BLOCKED);
    });
  });

  describe('Linkback Prevention', () => {
    it('should block attempts to link to production data', async () => {
      const decision = await enforcer.checkLinkback(
        sandboxProfile,
        {
          sandboxId: sandboxProfile.id,
          userId: testUserId,
          operation: OperationType.DATA_ACCESS,
          resourceId: 'entity-123',
        },
        'prod_entity-456'
      );

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.LINKBACK_BLOCKED);
    });

    it('should log all linkback attempts', async () => {
      await enforcer.checkLinkback(
        sandboxProfile,
        {
          sandboxId: sandboxProfile.id,
          userId: testUserId,
          operation: OperationType.DATA_ACCESS,
        },
        'prod_123'
      );

      await enforcer.checkLinkback(
        sandboxProfile,
        {
          sandboxId: sandboxProfile.id,
          userId: 'another-user',
          operation: OperationType.EXPORT,
        },
        'prod_456'
      );

      const attempts = enforcer.getLinkbackAttempts(sandboxProfile.id);
      expect(attempts).toHaveLength(2);
      expect(attempts[0].blocked).toBe(true);
      expect(attempts[1].blocked).toBe(true);
    });

    it('should calculate risk scores for linkback attempts', async () => {
      const exportDecision = await enforcer.checkLinkback(
        sandboxProfile,
        {
          sandboxId: sandboxProfile.id,
          userId: testUserId,
          operation: OperationType.EXPORT,
        },
        'prod_123'
      );

      const queryDecision = await enforcer.checkLinkback(
        sandboxProfile,
        {
          sandboxId: sandboxProfile.id,
          userId: testUserId,
          operation: OperationType.QUERY,
        }
      );

      const attempts = enforcer.getLinkbackAttempts(sandboxProfile.id);
      // Export operations should have higher risk
      expect(attempts[0].riskScore).toBeGreaterThan(attempts[1].riskScore);
    });
  });

  describe('Export Restrictions', () => {
    it('should block exports when disabled', async () => {
      // Default profile has exports disabled
      expect(sandboxProfile.resourceQuotas.maxDataExportMb).toBe(0);

      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.EXPORT,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.EXPORT_BLOCKED);
    });

    it('should allow exports when enabled within quota', async () => {
      sandboxProfile.resourceQuotas.maxDataExportMb = 100;
      sandboxProfile.integrationRestrictions.allowExternalExports = false;

      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.EXPORT,
        // No target endpoint = internal export
      });

      expect(decision.allowed).toBe(true);
    });

    it('should block external exports when not allowed', async () => {
      sandboxProfile.resourceQuotas.maxDataExportMb = 100;
      sandboxProfile.integrationRestrictions.allowExternalExports = false;

      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.EXPORT,
        targetEndpoint: 'external-system.example.com',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.EXPORT_BLOCKED);
    });
  });

  describe('PII Protection', () => {
    it('should detect and block PII fields when configured', async () => {
      sandboxProfile.dataAccessPolicy.piiHandling = 'block';

      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.DATA_ACCESS,
        dataFields: ['id', 'name', 'ssn', 'status'],
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.PII_DETECTED);
    });

    it('should warn about PII when redacting', async () => {
      sandboxProfile.dataAccessPolicy.piiHandling = 'redact';

      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.DATA_ACCESS,
        dataFields: ['id', 'name', 'email', 'status'],
      });

      expect(decision.allowed).toBe(true);
      expect(decision.warnings.some(w => w.includes('PII'))).toBe(true);
    });

    it('should detect various PII field patterns', async () => {
      sandboxProfile.dataAccessPolicy.piiHandling = 'block';

      const piiFields = [
        'ssn',
        'social_security_number',
        'credit_card',
        'email_address',
        'phone_number',
        'date_of_birth',
        'password',
        'api_key',
      ];

      for (const field of piiFields) {
        const decision = await enforcer.enforce(sandboxProfile, {
          sandboxId: sandboxProfile.id,
          userId: testUserId,
          operation: OperationType.DATA_ACCESS,
          dataFields: ['id', field],
        });

        expect(decision.allowed).toBe(false);
        expect(decision.code).toBe(SandboxErrorCode.PII_DETECTED);
      }
    });
  });

  describe('Connector Restrictions', () => {
    it('should allow configured connectors', async () => {
      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.DATABASE,
        targetEndpoint: 'sandbox-db',
      });

      expect(decision.allowed).toBe(true);
    });

    it('should block connectors in blocklist', async () => {
      // Add production to blocklist
      const dbConnector = sandboxProfile.connectorRestrictions.find(
        c => c.connectorType === ConnectorType.DATABASE
      );
      if (dbConnector) {
        dbConnector.blocklist = ['production-*'];
      }

      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.DATABASE,
        targetEndpoint: 'production-main',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.CONNECTOR_BLOCKED);
    });

    it('should block external services for enhanced isolation', async () => {
      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.EXTERNAL_SERVICE,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.CONNECTOR_BLOCKED);
    });
  });

  describe('Airgapped Isolation', () => {
    let airgappedProfile: SandboxTenantProfile;

    beforeEach(async () => {
      airgappedProfile = await configManager.createProfile(
        {
          name: 'Airgapped Test Sandbox',
          isolationLevel: SandboxIsolationLevel.AIRGAPPED,
          expiresInDays: 1,
        },
        testOwnerId
      );
      airgappedProfile = await configManager.activateProfile(airgappedProfile.id);
    });

    it('should block all network operations', async () => {
      expect(airgappedProfile.resourceQuotas.maxNetworkBytesPerHour).toBe(0);
    });

    it('should block API connectors', async () => {
      const decision = await enforcer.enforce(airgappedProfile, {
        sandboxId: airgappedProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.API,
      });

      expect(decision.allowed).toBe(false);
    });

    it('should only allow local database access', async () => {
      const decision = await enforcer.enforce(airgappedProfile, {
        sandboxId: airgappedProfile.id,
        userId: testUserId,
        operation: OperationType.CONNECTOR_USE,
        connectorType: ConnectorType.DATABASE,
        targetEndpoint: 'sandbox-db',
      });

      expect(decision.allowed).toBe(true);
    });
  });

  describe('Data Clone Isolation', () => {
    it('should enforce synthetic-only data in synthetic mode', async () => {
      sandboxProfile.dataAccessPolicy.mode = DataAccessMode.SYNTHETIC_ONLY;

      const cloneRequest = {
        id: uuidv4(),
        sandboxId: sandboxProfile.id,
        name: 'Test Clone',
        sourceType: DataSourceType.NEO4J,
        sourceConfig: {},
        strategy: CloneStrategy.ANONYMIZED, // Should fail
        fieldAnonymization: [],
        outputFormat: 'neo4j' as const,
        includeRelationships: true,
        preserveGraph: true,
        requestedBy: testUserId,
        requestedAt: new Date(),
      };

      await expect(
        cloneService.clone(cloneRequest, sandboxProfile)
      ).rejects.toMatchObject({
        code: 'DATALAB_VALIDATION_FAILED',
      });
    });

    it('should allow synthetic clone in any mode', async () => {
      const cloneRequest = {
        id: uuidv4(),
        sandboxId: sandboxProfile.id,
        name: 'Synthetic Clone',
        sourceType: DataSourceType.NEO4J,
        sourceConfig: {},
        strategy: CloneStrategy.SYNTHETIC,
        fieldAnonymization: [],
        outputFormat: 'neo4j' as const,
        includeRelationships: true,
        preserveGraph: true,
        requestedBy: testUserId,
        requestedAt: new Date(),
      };

      const result = await cloneService.clone(cloneRequest, sandboxProfile);
      expect(result.status).toBe('completed');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      sandboxProfile.resourceQuotas.maxExecutionsPerHour = 5;

      // Execute up to the limit
      for (let i = 0; i < 5; i++) {
        const decision = await enforcer.enforce(sandboxProfile, {
          sandboxId: sandboxProfile.id,
          userId: testUserId,
          operation: OperationType.QUERY,
        });
        expect(decision.allowed).toBe(true);
      }

      // Next should be blocked
      const blockedDecision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.QUERY,
      });

      expect(blockedDecision.allowed).toBe(false);
      expect(blockedDecision.code).toBe(SandboxErrorCode.QUOTA_EXCEEDED);
    });
  });

  describe('Sandbox Lifecycle', () => {
    it('should block operations on suspended sandbox', async () => {
      const suspended = await configManager.suspendProfile(
        sandboxProfile.id,
        'Test suspension'
      );

      const decision = await enforcer.enforce(suspended, {
        sandboxId: suspended.id,
        userId: testUserId,
        operation: OperationType.QUERY,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.SUSPENDED);
    });

    it('should block operations on expired sandbox', async () => {
      sandboxProfile.expiresAt = new Date('2020-01-01');

      const decision = await enforcer.enforce(sandboxProfile, {
        sandboxId: sandboxProfile.id,
        userId: testUserId,
        operation: OperationType.QUERY,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(SandboxErrorCode.EXPIRED);
    });
  });
});
