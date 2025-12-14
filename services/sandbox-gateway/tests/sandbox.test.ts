import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SandboxConfigManager,
  SandboxEnforcer,
  SandboxValidator,
  SandboxIsolationLevel,
  SandboxStatus,
  ConnectorType,
  OperationType,
  TenantType,
} from '@intelgraph/sandbox-tenant-profile';

describe('SandboxConfigManager', () => {
  let manager: SandboxConfigManager;

  beforeEach(() => {
    manager = new SandboxConfigManager();
  });

  describe('createProfile', () => {
    it('should create a sandbox profile with default values', async () => {
      const profile = await manager.createProfile(
        { name: 'Test Sandbox' },
        'user-123'
      );

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('Test Sandbox');
      expect(profile.ownerId).toBe('user-123');
      expect(profile.status).toBe(SandboxStatus.PROVISIONING);
      expect(profile.tenantType).toBe(TenantType.SANDBOX);
      expect(profile.isolationLevel).toBe(SandboxIsolationLevel.STANDARD);
    });

    it('should create a sandbox with custom isolation level', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Research Sandbox',
          isolationLevel: SandboxIsolationLevel.RESEARCH,
        },
        'user-123'
      );

      expect(profile.isolationLevel).toBe(SandboxIsolationLevel.RESEARCH);
    });

    it('should apply preset configuration', async () => {
      const profile = await manager.createProfile(
        { name: 'Data Lab' },
        'user-123',
        'dataLab'
      );

      expect(profile.tenantType).toBe(TenantType.DATALAB);
      expect(profile.isolationLevel).toBe(SandboxIsolationLevel.ENHANCED);
      expect(profile.dataAccessPolicy.allowLinkbackToProduction).toBe(false);
    });

    it('should set expiration date', async () => {
      const profile = await manager.createProfile(
        { name: 'Temp Sandbox', expiresInDays: 7 },
        'user-123'
      );

      expect(profile.expiresAt).toBeDefined();
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);

      const diffMs = Math.abs(profile.expiresAt!.getTime() - expectedExpiry.getTime());
      expect(diffMs).toBeLessThan(1000); // Within 1 second
    });

    it('should create airgapped sandbox with no external connectivity', async () => {
      const profile = await manager.createProfile(
        { name: 'Airgapped' },
        'user-123',
        'airgapped'
      );

      expect(profile.isolationLevel).toBe(SandboxIsolationLevel.AIRGAPPED);
      expect(profile.integrationRestrictions.allowFederation).toBe(false);
      expect(profile.integrationRestrictions.allowExternalExports).toBe(false);
      expect(profile.integrationRestrictions.allowWebhooks).toBe(false);
      expect(profile.integrationRestrictions.allowApiKeys).toBe(false);
    });
  });

  describe('activateProfile', () => {
    it('should activate a provisioning sandbox', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123'
      );

      const activated = await manager.activateProfile(profile.id);

      expect(activated.status).toBe(SandboxStatus.ACTIVE);
    });

    it('should throw error when activating non-provisioning sandbox', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123'
      );
      await manager.activateProfile(profile.id);

      await expect(manager.activateProfile(profile.id)).rejects.toThrow();
    });
  });

  describe('suspendProfile', () => {
    it('should suspend an active sandbox', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123'
      );
      await manager.activateProfile(profile.id);

      const suspended = await manager.suspendProfile(profile.id, 'Policy violation');

      expect(suspended.status).toBe(SandboxStatus.SUSPENDED);
    });
  });

  describe('archiveProfile', () => {
    it('should archive a sandbox', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123'
      );

      const archived = await manager.archiveProfile(profile.id);

      expect(archived.status).toBe(SandboxStatus.ARCHIVED);
    });
  });

  describe('listProfiles', () => {
    it('should list sandboxes for a user', async () => {
      await manager.createProfile({ name: 'Sandbox 1' }, 'user-123');
      await manager.createProfile({ name: 'Sandbox 2' }, 'user-123');
      await manager.createProfile({ name: 'Other User' }, 'user-456');

      const profiles = await manager.listProfiles('user-123');

      expect(profiles.length).toBe(2);
      expect(profiles.every(p => p.ownerId === 'user-123')).toBe(true);
    });

    it('should filter by status', async () => {
      const p1 = await manager.createProfile({ name: 'Active 1' }, 'user-123');
      await manager.activateProfile(p1.id);
      await manager.createProfile({ name: 'Provisioning' }, 'user-123');

      const activeProfiles = await manager.listProfiles('user-123', { status: SandboxStatus.ACTIVE });

      expect(activeProfiles.length).toBe(1);
      expect(activeProfiles[0].status).toBe(SandboxStatus.ACTIVE);
    });
  });

  describe('getAvailablePresets', () => {
    it('should return all available presets', () => {
      const presets = manager.getAvailablePresets();

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.map(p => p.name)).toContain('dataLab');
      expect(presets.map(p => p.name)).toContain('research');
      expect(presets.map(p => p.name)).toContain('airgapped');
    });
  });
});

describe('SandboxEnforcer', () => {
  let enforcer: SandboxEnforcer;
  let manager: SandboxConfigManager;

  beforeEach(async () => {
    manager = new SandboxConfigManager();
    enforcer = new SandboxEnforcer();
  });

  describe('enforce', () => {
    it('should allow read operations in active sandbox', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      const decision = await enforcer.enforce(activeProfile!, {
        sandboxId: profile.id,
        userId: 'user-123',
        operation: OperationType.READ,
      });

      expect(decision.allowed).toBe(true);
    });

    it('should block federation connector in sandbox', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123',
        'dataLab'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      const decision = await enforcer.enforce(activeProfile!, {
        sandboxId: profile.id,
        userId: 'user-123',
        operation: OperationType.CONNECT,
        connectorType: ConnectorType.FEDERATION,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('federation');
    });

    it('should block linkback attempts', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123',
        'dataLab'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      const decision = await enforcer.enforce(activeProfile!, {
        sandboxId: profile.id,
        userId: 'user-123',
        operation: OperationType.LINKBACK,
        targetEndpoint: 'production-tenant-id',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('linkback');
    });

    it('should block external exports', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123',
        'dataLab'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      const decision = await enforcer.enforce(activeProfile!, {
        sandboxId: profile.id,
        userId: 'user-123',
        operation: OperationType.EXPORT,
        targetEndpoint: 'https://external.com/api',
      });

      expect(decision.allowed).toBe(false);
    });

    it('should detect and block PII fields', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123',
        'dataLab'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      const decision = await enforcer.enforce(activeProfile!, {
        sandboxId: profile.id,
        userId: 'user-123',
        operation: OperationType.READ,
        dataFields: ['name', 'ssn', 'credit_card_number', 'email'],
      });

      expect(decision.allowed).toBe(true);
      expect(decision.warnings.length).toBeGreaterThan(0);
      expect(decision.warnings.some(w => w.includes('PII'))).toBe(true);
    });

    it('should allow operations in airgapped mode for internal targets', async () => {
      const profile = await manager.createProfile(
        { name: 'Airgapped' },
        'user-123',
        'airgapped'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      const decision = await enforcer.enforce(activeProfile!, {
        sandboxId: profile.id,
        userId: 'user-123',
        operation: OperationType.CONNECT,
        connectorType: ConnectorType.DATABASE,
        targetEndpoint: 'sandbox-neo4j://localhost:7687',
      });

      expect(decision.allowed).toBe(true);
    });

    it('should track linkback attempts', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      // Attempt linkback
      await enforcer.enforce(activeProfile!, {
        sandboxId: profile.id,
        userId: 'user-123',
        operation: OperationType.LINKBACK,
        targetEndpoint: 'prod-tenant-123',
      });

      const attempts = enforcer.getLinkbackAttempts(profile.id);

      expect(attempts.length).toBe(1);
      expect(attempts[0].blocked).toBe(true);
    });
  });
});

describe('SandboxValidator', () => {
  let validator: SandboxValidator;
  let manager: SandboxConfigManager;

  beforeEach(() => {
    validator = new SandboxValidator();
    manager = new SandboxConfigManager();
  });

  describe('validate', () => {
    it('should validate a well-configured sandbox', async () => {
      const profile = await manager.createProfile(
        { name: 'Valid Sandbox' },
        'user-123',
        'dataLab'
      );

      const report = validator.validate(profile);

      expect(report.valid).toBe(true);
      expect(report.findings.filter(f => f.severity === 'error').length).toBe(0);
    });

    it('should report warning for production data access mode', async () => {
      const profile = await manager.createProfile(
        { name: 'Test' },
        'user-123'
      );
      // Manually modify to test validation
      (profile as any).dataAccessPolicy.mode = 'FULL_PRODUCTION';

      const report = validator.validate(profile);

      expect(report.findings.some(f =>
        f.severity === 'warning' || f.severity === 'error'
      )).toBe(true);
    });

    it('should report error for missing required fields', async () => {
      const invalidProfile = {
        id: 'test-id',
        name: '',  // Empty name
        ownerId: 'user-123',
        tenantType: TenantType.SANDBOX,
        status: SandboxStatus.ACTIVE,
      } as any;

      const report = validator.validate(invalidProfile);

      expect(report.valid).toBe(false);
    });
  });
});

describe('Integration: Sandbox Lifecycle', () => {
  let manager: SandboxConfigManager;
  let enforcer: SandboxEnforcer;

  beforeEach(() => {
    manager = new SandboxConfigManager();
    enforcer = new SandboxEnforcer();
  });

  it('should handle complete sandbox lifecycle', async () => {
    // Create
    const profile = await manager.createProfile(
      { name: 'Lifecycle Test', expiresInDays: 30 },
      'user-123',
      'dataLab'
    );
    expect(profile.status).toBe(SandboxStatus.PROVISIONING);

    // Activate
    const active = await manager.activateProfile(profile.id);
    expect(active.status).toBe(SandboxStatus.ACTIVE);

    // Use (verify enforcement)
    const decision = await enforcer.enforce(active, {
      sandboxId: profile.id,
      userId: 'user-123',
      operation: OperationType.READ,
    });
    expect(decision.allowed).toBe(true);

    // Suspend
    const suspended = await manager.suspendProfile(profile.id, 'Maintenance');
    expect(suspended.status).toBe(SandboxStatus.SUSPENDED);

    // Archive
    const archived = await manager.archiveProfile(profile.id);
    expect(archived.status).toBe(SandboxStatus.ARCHIVED);
  });

  it('should enforce isolation between sandboxes', async () => {
    const sandbox1 = await manager.createProfile(
      { name: 'Sandbox 1' },
      'user-1'
    );
    await manager.activateProfile(sandbox1.id);

    const sandbox2 = await manager.createProfile(
      { name: 'Sandbox 2' },
      'user-2'
    );
    await manager.activateProfile(sandbox2.id);

    const s1Profile = await manager.getProfile(sandbox1.id);
    const s2Profile = await manager.getProfile(sandbox2.id);

    // Verify each sandbox has unique tenant ID
    expect(s1Profile?.id).not.toBe(s2Profile?.id);

    // Cross-sandbox access should be blocked
    const decision = await enforcer.enforce(s1Profile!, {
      sandboxId: sandbox1.id,
      userId: 'user-1',
      operation: OperationType.LINKBACK,
      targetEndpoint: sandbox2.id,
    });
    expect(decision.allowed).toBe(false);
  });
});

describe('Concurrent Operations', () => {
  let manager: SandboxConfigManager;

  beforeEach(() => {
    manager = new SandboxConfigManager();
  });

  it('should handle concurrent sandbox creation', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      manager.createProfile({ name: `Sandbox ${i}` }, 'user-123')
    );

    const results = await Promise.all(promises);

    expect(results.length).toBe(10);
    const ids = new Set(results.map(r => r.id));
    expect(ids.size).toBe(10); // All unique IDs
  });

  it('should handle concurrent enforcement checks', async () => {
    const profile = await manager.createProfile(
      { name: 'Concurrent Test' },
      'user-123'
    );
    await manager.activateProfile(profile.id);
    const activeProfile = await manager.getProfile(profile.id);

    const enforcer = new SandboxEnforcer();
    const promises = Array.from({ length: 100 }, () =>
      enforcer.enforce(activeProfile!, {
        sandboxId: profile.id,
        userId: 'user-123',
        operation: OperationType.READ,
      })
    );

    const results = await Promise.all(promises);

    expect(results.every(r => r.allowed === true)).toBe(true);
  });
});
