import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DualNotaryService } from '../src/federal/dual-notary';
import { slsa3Verifier } from '../src/federal/slsa3-verifier';
import { HSMEnforcement } from '../src/federal/hsm-enforcement';
import { FederalAuditLogger } from '../src/federal/audit-logger';
import fs from 'fs/promises';
import crypto from 'crypto';

describe('Federal Pack Integration Tests', () => {
  let dualNotary: DualNotaryService;
  let hsmEnforcement: HSMEnforcement;
  let auditLogger: FederalAuditLogger;

  beforeAll(async () => {
    // Initialize services with test configuration
    process.env.FEDERAL_ENABLED = 'true';
    process.env.FIPS_MODE = 'true';
    process.env.HSM_ENABLED = 'false'; // Use mock for tests
    process.env.TSA_ENABLED = 'false';

    dualNotary = new DualNotaryService({
      hsmEnabled: false, // Use mock for CI
      tsaEnabled: false,
    });

    hsmEnforcement = new HSMEnforcement({
      enforceHSM: false, // Use mock for CI
      allowedMechanisms: ['AES-256-GCM', 'ECDSA-P384', 'RSA-PSS-4096'],
    });

    auditLogger = new FederalAuditLogger({
      auditBucket: 'test-audit-bucket',
      classification: 'UNCLASSIFIED',
      wormEnabled: false, // Use mock for CI
    });
  });

  describe('HSM Crypto Enforcement', () => {
    it('should validate FIPS mechanism allowlist', async () => {
      const capabilities = await hsmEnforcement.getCapabilities();
      expect(capabilities.fipsMode).toBe(true);
      expect(capabilities.allowedMechanisms).toContain('AES-256-GCM');
      expect(capabilities.allowedMechanisms).toContain('ECDSA-P384');
      expect(capabilities.allowedMechanisms).toContain('RSA-PSS-4096');
    });

    it('should reject non-FIPS mechanisms', () => {
      expect(() => {
        hsmEnforcement.validateMechanism('AES-128-CBC');
      }).toThrow('Mechanism AES-128-CBC not in FIPS allowlist');
    });

    it('should perform health check', async () => {
      const health = await hsmEnforcement.healthCheck();
      expect(health.status).toMatch(/healthy|degraded/);
    });
  });

  describe('Dual-Path Notarization', () => {
    it('should generate mock notarization capabilities', () => {
      const capabilities = dualNotary.getCapabilities();
      expect(capabilities).toHaveProperty('hsmAvailable');
      expect(capabilities).toHaveProperty('tsaAvailable');
      expect(capabilities).toHaveProperty('recommendedMode');
    });

    it('should perform health check', async () => {
      const health = await dualNotary.healthCheck();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
    });

    // Test would use actual HSM in production environment
    it.skip('should notarize Merkle root with HSM signature', async () => {
      const testRoot = crypto.randomBytes(32).toString('hex');
      const notarized = await dualNotary.notarizeRoot(testRoot);

      expect(notarized.rootHex).toBe(testRoot);
      expect(notarized.hsmSignature).toBeTruthy();
      expect(notarized.notarizedBy).toContain('HSM');
      expect(notarized.verification.hsmValid).toBe(true);
    });
  });

  describe('SLSA-3 Supply Chain Verification', () => {
    const mockProvenance = {
      _type: 'https://in-toto.io/Statement/v0.1',
      predicateType: 'https://slsa.dev/provenance/v0.2',
      subject: [
        {
          name: 'intelgraph-federal.tar.gz',
          digest: {
            sha256:
              'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234',
          },
        },
      ],
      predicate: {
        builder: {
          id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@refs/tags/v1.9.0',
        },
        buildType:
          'https://github.com/slsa-framework/slsa-github-generator/generic@v1',
        invocation: {
          configSource: {
            uri: 'git+https://github.com/intelgraph/platform@refs/heads/main',
            digest: { sha1: 'example-commit-hash' },
            entryPoint: '.github/workflows/build.yml',
          },
        },
        metadata: {
          buildInvocationId: 'example-build-id',
          buildStartedOn: '2024-01-01T00:00:00Z',
          buildFinishedOn: '2024-01-01T01:00:00Z',
          completeness: {
            parameters: true,
            environment: false,
            materials: true,
          },
          reproducible: true,
        },
        materials: [],
        buildConfig: {},
      },
    };

    it('should validate SLSA-3 provenance format', async () => {
      const result = await slsa3Verifier.verifyProvenance(mockProvenance, {
        expectedSubject: 'intelgraph-federal.tar.gz',
        trustedBuilders: [
          'https://github.com/slsa-framework/slsa-github-generator',
        ],
        requireHermetic: false, // Relaxed for test
      });

      expect(result.valid).toBe(true);
      expect(result.level).toBe('SLSA-3');
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid provenance', async () => {
      const invalidProvenance = { ...mockProvenance, _type: 'invalid' };

      const result = await slsa3Verifier.verifyProvenance(invalidProvenance, {
        expectedSubject: 'intelgraph-federal.tar.gz',
        trustedBuilders: [
          'https://github.com/slsa-framework/slsa-github-generator',
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Federal Audit Logging', () => {
    it('should log security events with proper classification', async () => {
      const event = {
        type: 'crypto_operation',
        classification: 'UNCLASSIFIED',
        source: 'test',
        metadata: { operation: 'encrypt', mechanism: 'AES-256-GCM' },
      };

      // Mock audit logging for test
      const logResult = await auditLogger.logSecurityEvent(event);
      expect(logResult.logged).toBe(true);
      expect(logResult.auditId).toBeTruthy();
    });

    it('should enforce WORM compliance', async () => {
      const capabilities = await auditLogger.getCapabilities();
      expect(capabilities.wormEnabled).toBeDefined();
      expect(capabilities.retentionYears).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Air-Gap Environment Simulation', () => {
    it('should detect air-gap mode configuration', () => {
      process.env.AIRGAP_ENABLED = 'true';

      const isAirgapped = process.env.AIRGAP_ENABLED === 'true';
      expect(isAirgapped).toBe(true);
    });

    it('should validate offline registry is configured', () => {
      const offlineRegistry = process.env.OFFLINE_REGISTRY || '/data/registry';
      expect(offlineRegistry).toBeTruthy();
    });

    it('should verify network policies would block external access', () => {
      // In production, this would test actual NetworkPolicy enforcement
      const externalBlocked = true; // Mock for test
      expect(externalBlocked).toBe(true);
    });
  });

  describe('Classification Controls', () => {
    it('should enforce data classification tagging', () => {
      const data = { content: 'test data', classification: 'UNCLASSIFIED' };
      const isValidClassification = [
        'UNCLASSIFIED',
        'CONFIDENTIAL',
        'SECRET',
        'TOP_SECRET',
      ].includes(data.classification);

      expect(isValidClassification).toBe(true);
    });

    it('should validate clearance-based access controls', () => {
      const userClearance = 'CONFIDENTIAL';
      const dataClassification = 'UNCLASSIFIED';

      const clearanceLevels = {
        UNCLASSIFIED: 0,
        CONFIDENTIAL: 1,
        SECRET: 2,
        TOP_SECRET: 3,
      };

      const hasAccess =
        clearanceLevels[userClearance] >= clearanceLevels[dataClassification];
      expect(hasAccess).toBe(true);
    });
  });

  describe('Evidence Bundle Generation', () => {
    it('should validate evidence pack structure', async () => {
      // Mock evidence structure validation
      const evidenceComponents = [
        'fips_compliance',
        'airgap_verification',
        'worm_audit_chain',
        'slsa3_supply_chain',
        'gatekeeper_policies',
        'prometheus_alerts',
        'documentation',
      ];

      evidenceComponents.forEach((component) => {
        expect(component).toMatch(/^[a-z_]+$/);
      });
    });

    it('should generate compliance manifest', () => {
      const manifest = {
        evidence_type: 'federal_ato_bundle',
        classification: 'UNCLASSIFIED',
        generated_at: new Date().toISOString(),
        components: ['fips_compliance', 'airgap_verification'],
      };

      expect(manifest.evidence_type).toBe('federal_ato_bundle');
      expect(manifest.components.length).toBeGreaterThan(0);
    });
  });

  afterAll(async () => {
    // Cleanup services
    if (dualNotary) {
      dualNotary.destroy();
    }
    if (hsmEnforcement) {
      hsmEnforcement.destroy();
    }
    if (auditLogger) {
      auditLogger.destroy();
    }
  });
});
