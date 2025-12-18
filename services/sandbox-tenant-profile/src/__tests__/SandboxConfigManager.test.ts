import { describe, it, expect, beforeEach } from 'vitest';
import {
  SandboxConfigManager,
  SANDBOX_PRESETS,
} from '../config/SandboxConfigManager.js';
import {
  SandboxIsolationLevel,
  SandboxStatus,
  TenantType,
  DataAccessMode,
  SandboxErrorCode,
} from '../types/index.js';

describe('SandboxConfigManager', () => {
  let manager: SandboxConfigManager;
  const testOwnerId = 'user-123';

  beforeEach(() => {
    manager = new SandboxConfigManager();
  });

  describe('createProfile', () => {
    it('should create a sandbox profile with default settings', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          description: 'A test sandbox',
          expiresInDays: 30,
        },
        testOwnerId
      );

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('Test Sandbox');
      expect(profile.description).toBe('A test sandbox');
      expect(profile.ownerId).toBe(testOwnerId);
      expect(profile.tenantType).toBe(TenantType.SANDBOX);
      expect(profile.isolationLevel).toBe(SandboxIsolationLevel.ENHANCED);
      expect(profile.status).toBe(SandboxStatus.PROVISIONING);
      expect(profile.expiresAt).toBeDefined();
    });

    it('should create a sandbox with dataLab preset', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Data Lab Sandbox',
          expiresInDays: 30,
        },
        testOwnerId,
        'dataLab'
      );

      expect(profile.tenantType).toBe(TenantType.DATALAB);
      expect(profile.isolationLevel).toBe(SandboxIsolationLevel.ENHANCED);
      expect(profile.resourceQuotas.maxMemoryMb).toBe(2048);
      expect(profile.dataAccessPolicy.mode).toBe(DataAccessMode.SYNTHETIC_ONLY);
    });

    it('should create a sandbox with research preset', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Research Sandbox',
          expiresInDays: 90,
        },
        testOwnerId,
        'research'
      );

      expect(profile.isolationLevel).toBe(SandboxIsolationLevel.RESEARCH);
      expect(profile.dataAccessPolicy.mode).toBe(DataAccessMode.ANONYMIZED);
      expect(profile.resourceQuotas.maxDataExportMb).toBe(0);
    });

    it('should create a sandbox with airgapped preset', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Airgapped Sandbox',
          expiresInDays: 7,
        },
        testOwnerId,
        'airgapped'
      );

      expect(profile.isolationLevel).toBe(SandboxIsolationLevel.AIRGAPPED);
      expect(profile.dataAccessPolicy.mode).toBe(DataAccessMode.STRUCTURE_ONLY);
      expect(profile.resourceQuotas.maxNetworkBytesPerHour).toBe(0);
    });

    it('should override preset settings with request settings', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Custom Sandbox',
          expiresInDays: 30,
          resourceQuotas: {
            maxMemoryMb: 4096,
          },
        },
        testOwnerId,
        'dataLab'
      );

      expect(profile.resourceQuotas.maxMemoryMb).toBe(4096);
    });

    it('should reject linkback configuration', async () => {
      await expect(
        manager.createProfile(
          {
            name: 'Invalid Sandbox',
            expiresInDays: 30,
            dataAccessPolicy: {
              allowLinkbackToProduction: true,
            },
          },
          testOwnerId
        )
      ).rejects.toMatchObject({
        code: SandboxErrorCode.INVALID_CONFIGURATION,
      });
    });

    it('should set default connector restrictions based on isolation level', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          isolationLevel: SandboxIsolationLevel.AIRGAPPED,
          expiresInDays: 30,
        },
        testOwnerId
      );

      const federationConnector = profile.connectorRestrictions.find(
        c => c.connectorType === 'federation'
      );
      expect(federationConnector?.allowed).toBe(false);

      const apiConnector = profile.connectorRestrictions.find(
        c => c.connectorType === 'api'
      );
      expect(apiConnector?.allowed).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('should update sandbox profile', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          expiresInDays: 30,
        },
        testOwnerId
      );

      const updated = await manager.updateProfile(
        profile.id,
        {
          name: 'Updated Sandbox',
          resourceQuotas: {
            maxMemoryMb: 1024,
          },
        },
        testOwnerId
      );

      expect(updated.name).toBe('Updated Sandbox');
      expect(updated.resourceQuotas.maxMemoryMb).toBe(1024);
    });

    it('should reject invalid updates', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          expiresInDays: 30,
        },
        testOwnerId
      );

      await expect(
        manager.updateProfile(
          profile.id,
          {
            // @ts-expect-error - testing invalid update
            dataAccessPolicy: {
              allowLinkbackToProduction: true,
            },
          },
          testOwnerId
        )
      ).rejects.toMatchObject({
        code: SandboxErrorCode.INVALID_CONFIGURATION,
      });
    });
  });

  describe('lifecycle methods', () => {
    it('should activate a provisioning sandbox', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          expiresInDays: 30,
        },
        testOwnerId
      );

      expect(profile.status).toBe(SandboxStatus.PROVISIONING);

      const activated = await manager.activateProfile(profile.id);
      expect(activated.status).toBe(SandboxStatus.ACTIVE);
    });

    it('should suspend an active sandbox', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          expiresInDays: 30,
        },
        testOwnerId
      );
      await manager.activateProfile(profile.id);

      const suspended = await manager.suspendProfile(
        profile.id,
        'Security review required'
      );

      expect(suspended.status).toBe(SandboxStatus.SUSPENDED);
      expect(suspended.metadata.suspendReason).toBe('Security review required');
    });

    it('should archive a sandbox', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          expiresInDays: 30,
        },
        testOwnerId
      );

      const archived = await manager.archiveProfile(profile.id);
      expect(archived.status).toBe(SandboxStatus.ARCHIVED);
    });
  });

  describe('isExpired', () => {
    it('should return false for non-expired sandbox', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          expiresInDays: 30,
        },
        testOwnerId
      );

      expect(manager.isExpired(profile)).toBe(false);
    });

    it('should return true for expired sandbox', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          expiresInDays: 30,
        },
        testOwnerId
      );

      // Manually set expiration to past
      profile.expiresAt = new Date('2020-01-01');

      expect(manager.isExpired(profile)).toBe(true);
    });
  });

  describe('validateProfile', () => {
    it('should validate a correct profile', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Test Sandbox',
          expiresInDays: 30,
        },
        testOwnerId
      );

      const result = manager.validateProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid network in airgapped', async () => {
      const profile = await manager.createProfile(
        {
          name: 'Airgapped Sandbox',
          isolationLevel: SandboxIsolationLevel.AIRGAPPED,
          expiresInDays: 30,
        },
        testOwnerId
      );

      // Manually break the config
      profile.resourceQuotas.maxNetworkBytesPerHour = 1000;

      const result = manager.validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Airgapped sandbox cannot have network access');
    });
  });

  describe('listProfiles', () => {
    it('should list profiles for owner', async () => {
      await manager.createProfile(
        { name: 'Sandbox 1', expiresInDays: 30 },
        testOwnerId
      );
      await manager.createProfile(
        { name: 'Sandbox 2', expiresInDays: 30 },
        testOwnerId
      );
      await manager.createProfile(
        { name: 'Sandbox 3', expiresInDays: 30 },
        'other-user'
      );

      const profiles = await manager.listProfiles(testOwnerId);
      expect(profiles).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const profile1 = await manager.createProfile(
        { name: 'Sandbox 1', expiresInDays: 30 },
        testOwnerId
      );
      await manager.createProfile(
        { name: 'Sandbox 2', expiresInDays: 30 },
        testOwnerId
      );

      await manager.activateProfile(profile1.id);

      const activeProfiles = await manager.listProfiles(testOwnerId, {
        status: SandboxStatus.ACTIVE,
      });
      expect(activeProfiles).toHaveLength(1);
      expect(activeProfiles[0].name).toBe('Sandbox 1');
    });
  });

  describe('getAvailablePresets', () => {
    it('should return all available presets', () => {
      const presets = manager.getAvailablePresets();

      expect(presets).toHaveLength(5);
      expect(presets.map(p => p.name)).toContain('dataLab');
      expect(presets.map(p => p.name)).toContain('research');
      expect(presets.map(p => p.name)).toContain('demo');
      expect(presets.map(p => p.name)).toContain('training');
      expect(presets.map(p => p.name)).toContain('airgapped');
    });
  });
});
