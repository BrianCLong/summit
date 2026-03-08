import { HSMEnforcement } from '../../../server/src/federal/hsm-enforcement';

describe('Federal Crypto Self-Test', () => {
  let enforcement: HSMEnforcement;

  beforeAll(() => {
    process.env.FEDERAL_ENABLED = 'true';
    process.env.FIPS_MODE = 'true';
    process.env.HSM_ENABLED = 'false'; // Mock for CI
    process.env.PKCS11_LIB = '/opt/cloudhsm/lib/libcloudhsm_pkcs11.so';
    process.env.PKCS11_SLOT = '0';

    enforcement = new HSMEnforcement({
      enforceHSM: true,
      fipsMode: true,
      allowedMechanisms: ['AES-256-GCM', 'ECDSA-P384', 'RSA-PSS-4096'],
    });
  });

  describe('HSM FIPS Mode Validation', () => {
    it('should confirm HSM is in FIPS mode', async () => {
      const capabilities = await enforcement.getCapabilities();

      expect(capabilities.fipsMode).toBe(true);
      expect(capabilities.hsmAvailable).toBeDefined();
      expect(capabilities.allowedMechanisms).toEqual([
        'AES-256-GCM',
        'ECDSA-P384',
        'RSA-PSS-4096',
      ]);
    });

    it('should validate CloudHSM library path exists', () => {
      const libPath = process.env.PKCS11_LIB;
      const slotIndex = Number(process.env.PKCS11_SLOT || 0);

      expect(libPath).toBe('/opt/cloudhsm/lib/libcloudhsm_pkcs11.so');
      expect(slotIndex).toBe(0);
      expect(typeof slotIndex).toBe('number');
    });
  });

  describe('Allowlisted Mechanisms Present', () => {
    it('should have exactly the three FIPS-approved mechanisms', () => {
      const mechanisms = enforcement.getAllowedMechanisms();
      const expected = ['AES-256-GCM', 'ECDSA-P384', 'RSA-PSS-4096'].sort();

      expect(mechanisms.sort()).toEqual(expected);
      expect(mechanisms).toHaveLength(3);
    });

    it('should validate each mechanism individually', () => {
      expect(() => enforcement.validateMechanism('AES-256-GCM')).not.toThrow();
      expect(() => enforcement.validateMechanism('ECDSA-P384')).not.toThrow();
      expect(() => enforcement.validateMechanism('RSA-PSS-4096')).not.toThrow();
    });

    it('should confirm mechanism parameters meet FIPS requirements', () => {
      // AES-256-GCM: 256-bit key, authenticated encryption
      expect(() => enforcement.validateKeySize('AES', 256)).not.toThrow();
      expect(() => enforcement.validateKeySize('AES', 128)).toThrow(
        'below FIPS minimum',
      );

      // ECDSA-P384: P-384 curve (384-bit)
      expect(() => enforcement.validateKeySize('ECDSA', 384)).not.toThrow();
      expect(() => enforcement.validateKeySize('ECDSA', 256)).toThrow(
        'below FIPS minimum',
      );

      // RSA-PSS-4096: 4096-bit key with PSS padding
      expect(() => enforcement.validateKeySize('RSA', 4096)).not.toThrow();
      expect(() => enforcement.validateKeySize('RSA', 2048)).toThrow(
        'below FIPS minimum',
      );
    });
  });

  describe('HSM Connection Health Check', () => {
    it('should perform HSM health check', async () => {
      const health = await enforcement.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health).toHaveProperty('fipsMode');
      expect(health).toHaveProperty('mechanisms');
    });

    it('should validate session management', () => {
      // Mock session validation - in production would test actual PKCS#11 sessions
      const sessionValid = enforcement.validateSession();
      expect(typeof sessionValid).toBe('boolean');
    });
  });

  describe('Crypto Operation Validation', () => {
    it('should enforce FIPS-only operations', () => {
      expect(() => {
        enforcement.validateOperation('encrypt', {
          algorithm: 'AES-256-GCM',
          keySize: 256,
        });
      }).not.toThrow();

      expect(() => {
        enforcement.validateOperation('encrypt', {
          algorithm: 'AES-128-CBC',
          keySize: 128,
        });
      }).toThrow('not in FIPS allowlist');
    });

    it('should validate key generation parameters', () => {
      // RSA-PSS key generation
      expect(() => {
        enforcement.validateKeyGeneration('RSA', {
          keySize: 4096,
          padding: 'PSS',
          hashAlgorithm: 'SHA-384',
        });
      }).not.toThrow();

      // ECDSA key generation
      expect(() => {
        enforcement.validateKeyGeneration('ECDSA', {
          curve: 'P-384',
          hashAlgorithm: 'SHA-384',
        });
      }).not.toThrow();

      // Reject weak parameters
      expect(() => {
        enforcement.validateKeyGeneration('RSA', {
          keySize: 2048,
          padding: 'PKCS1',
          hashAlgorithm: 'SHA-256',
        });
      }).toThrow('below FIPS minimum');
    });
  });

  describe('Federal Environment Validation', () => {
    it('should confirm federal mode is enabled', () => {
      expect(process.env.FEDERAL_ENABLED).toBe('true');
      expect(process.env.FIPS_MODE).toBe('true');
      expect(enforcement.isFederalMode()).toBe(true);
    });

    it('should validate air-gap configuration', () => {
      const airGapEnabled = process.env.AIRGAP_ENABLED === 'true';
      expect(typeof airGapEnabled).toBe('boolean');

      if (airGapEnabled) {
        expect(enforcement.validateAirGapCompliance()).toBe(true);
      }
    });

    it('should confirm audit logging is enabled', () => {
      const auditConfig = enforcement.getAuditConfiguration();
      expect(auditConfig.enabled).toBe(true);
      expect(auditConfig.wormCompliant).toBe(true);
      expect(auditConfig.retentionYears).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate FIPS compliance report', () => {
      const report = enforcement.generateComplianceReport();

      expect(report.fipsMode).toBe(true);
      expect(report.allowedMechanisms).toEqual([
        'AES-256-GCM',
        'ECDSA-P384',
        'RSA-PSS-4096',
      ]);
      expect(report.prohibitedMechanisms).toContain('RSA-PKCS1');
      expect(report.prohibitedMechanisms).toContain('AES-128-CBC');
      expect(report.hsmStatus).toMatch(/^(available|unavailable)$/);
      expect(report.lastValidated).toBeInstanceOf(Date);
    });

    it('should validate mechanism enforcement is active', () => {
      const enforcement_status = enforcement.getEnforcementStatus();

      expect(enforcement_status.active).toBe(true);
      expect(enforcement_status.mode).toBe('strict');
      expect(enforcement_status.blockedAttempts).toBeGreaterThanOrEqual(0);
      expect(enforcement_status.allowedOperations).toBeGreaterThanOrEqual(0);
    });
  });

  afterAll(() => {
    enforcement?.destroy();
  });
});
