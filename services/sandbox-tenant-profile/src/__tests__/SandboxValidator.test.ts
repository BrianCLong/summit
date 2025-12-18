import { describe, it, expect, beforeEach } from 'vitest';
import {
  SandboxValidator,
  ValidationSeverity,
} from '../validation/SandboxValidator.js';
import { SandboxConfigManager } from '../config/SandboxConfigManager.js';
import {
  SandboxTenantProfile,
  SandboxIsolationLevel,
  DataAccessMode,
  ConnectorType,
} from '../types/index.js';

describe('SandboxValidator', () => {
  let validator: SandboxValidator;
  let configManager: SandboxConfigManager;
  let testProfile: SandboxTenantProfile;
  const testOwnerId = 'owner-123';

  beforeEach(async () => {
    validator = new SandboxValidator();
    configManager = new SandboxConfigManager();

    testProfile = await configManager.createProfile(
      {
        name: 'Test Sandbox',
        expiresInDays: 30,
      },
      testOwnerId
    );
  });

  describe('validate', () => {
    it('should validate a correct profile', () => {
      const report = validator.validate(testProfile);

      expect(report.valid).toBe(true);
      expect(report.profileId).toBe(testProfile.id);
      expect(
        report.findings.filter(f => f.severity === ValidationSeverity.ERROR)
      ).toHaveLength(0);
    });

    it('should detect linkback enabled (SEC001)', () => {
      testProfile.dataAccessPolicy.allowLinkbackToProduction = true;

      const report = validator.validate(testProfile);

      expect(report.valid).toBe(false);
      const finding = report.findings.find(f => f.code === 'SEC001');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(ValidationSeverity.ERROR);
    });

    it('should detect federation enabled (SEC002)', () => {
      testProfile.integrationRestrictions.allowFederation = true;

      const report = validator.validate(testProfile);

      expect(report.valid).toBe(false);
      const finding = report.findings.find(f => f.code === 'SEC002');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(ValidationSeverity.ERROR);
    });

    it('should detect federation connector enabled (SEC002)', () => {
      const federationConnector = testProfile.connectorRestrictions.find(
        c => c.connectorType === ConnectorType.FEDERATION
      );
      if (federationConnector) {
        federationConnector.allowed = true;
      }

      const report = validator.validate(testProfile);

      expect(report.valid).toBe(false);
      expect(report.findings.some(f => f.code === 'SEC002')).toBe(true);
    });

    it('should detect network access in airgapped mode (SEC003)', async () => {
      testProfile = await configManager.createProfile(
        {
          name: 'Airgapped Sandbox',
          isolationLevel: SandboxIsolationLevel.AIRGAPPED,
          expiresInDays: 7,
        },
        testOwnerId
      );

      // Break the config
      testProfile.resourceQuotas.maxNetworkBytesPerHour = 1000;

      const report = validator.validate(testProfile);

      expect(report.valid).toBe(false);
      const finding = report.findings.find(f => f.code === 'SEC003');
      expect(finding).toBeDefined();
      expect(finding?.message).toContain('Airgapped');
    });

    it('should detect external services in airgapped mode (SEC004)', async () => {
      testProfile = await configManager.createProfile(
        {
          name: 'Airgapped Sandbox',
          isolationLevel: SandboxIsolationLevel.AIRGAPPED,
          expiresInDays: 7,
        },
        testOwnerId
      );

      // Break the config
      const externalConnector = testProfile.connectorRestrictions.find(
        c => c.connectorType === ConnectorType.EXTERNAL_SERVICE
      );
      if (externalConnector) {
        externalConnector.allowed = true;
      }

      const report = validator.validate(testProfile);

      expect(report.valid).toBe(false);
      expect(report.findings.some(f => f.code === 'SEC004')).toBe(true);
    });

    it('should warn about disabled audit logging (SEC005)', () => {
      testProfile.auditConfig.logAllQueries = false;
      testProfile.auditConfig.logAllMutations = false;

      const report = validator.validate(testProfile);

      const finding = report.findings.find(f => f.code === 'SEC005');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should warn about long data retention (DATA001)', () => {
      testProfile.dataAccessPolicy.retentionDays = 180;

      const report = validator.validate(testProfile);

      const finding = report.findings.find(f => f.code === 'DATA001');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should warn about PII handling with non-synthetic data (DATA002)', () => {
      testProfile.dataAccessPolicy.mode = DataAccessMode.SAMPLED;
      testProfile.dataAccessPolicy.piiHandling = 'hash';

      const report = validator.validate(testProfile);

      const finding = report.findings.find(f => f.code === 'DATA002');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should info about large record limits (DATA003)', () => {
      testProfile.dataAccessPolicy.maxRecords = 500000;

      const report = validator.validate(testProfile);

      const finding = report.findings.find(f => f.code === 'DATA003');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(ValidationSeverity.INFO);
    });

    it('should warn about exports without anonymization audit (RES002)', () => {
      testProfile.resourceQuotas.maxDataExportMb = 100;
      testProfile.dataAccessPolicy.requireAnonymizationAudit = false;

      const report = validator.validate(testProfile);

      const finding = report.findings.find(f => f.code === 'RES002');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should warn about no expiration date (CFG002)', () => {
      testProfile.expiresAt = undefined;

      const report = validator.validate(testProfile);

      const finding = report.findings.find(f => f.code === 'CFG002');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(ValidationSeverity.WARNING);
    });
  });

  describe('hasErrors', () => {
    it('should return false for valid profile', () => {
      expect(validator.hasErrors(testProfile)).toBe(false);
    });

    it('should return true for profile with errors', () => {
      testProfile.integrationRestrictions.allowFederation = true;

      expect(validator.hasErrors(testProfile)).toBe(true);
    });
  });

  describe('addRule', () => {
    it('should allow adding custom validation rules', () => {
      validator.addRule({
        code: 'CUSTOM001',
        check: (profile) => {
          if (profile.name.includes('test')) {
            return {
              severity: ValidationSeverity.INFO,
              code: 'CUSTOM001',
              message: 'Name contains test',
            };
          }
          return null;
        },
      });

      const report = validator.validate(testProfile);

      // Profile name is "Test Sandbox"
      const finding = report.findings.find(f => f.code === 'CUSTOM001');
      expect(finding).toBeDefined();
    });
  });
});
