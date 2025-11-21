import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceEngine } from '../compliance/compliance-engine.js';
import type { ServiceDefinition } from '../types/index.js';

describe('ComplianceEngine', () => {
  let engine: ComplianceEngine;

  beforeEach(async () => {
    engine = new ComplianceEngine();
    await engine.initialize();
  });

  const createService = (overrides: Partial<ServiceDefinition> = {}): ServiceDefinition => ({
    name: 'test-service',
    version: '1.0.0',
    description: 'Test service',
    type: 'llm',
    config: {
      maxConcurrency: 10,
      timeoutMs: 30000,
      resources: {
        cpu: '500m',
        memory: '512Mi',
      },
      scaling: {
        minReplicas: 2,
        maxReplicas: 10,
        targetCPU: 70,
      },
    },
    compliance: {
      dataClassification: 'internal',
      piiHandling: false,
      auditLogging: true,
      encryption: {
        atRest: true,
        inTransit: true,
      },
    },
    healthCheck: {
      path: '/health',
      intervalSeconds: 30,
      timeoutSeconds: 5,
    },
    endpoints: [
      { path: '/predict', method: 'POST', auth: true },
    ],
    ...overrides,
  });

  describe('preDeploymentCheck', () => {
    it('should pass for compliant service', async () => {
      const service = createService();
      const result = await engine.preDeploymentCheck(service, 'production');

      expect(result.passed).toBe(true);
      expect(result.checks.every(c => c.status !== 'failed')).toBe(true);
    });

    it('should fail when encryption is disabled', async () => {
      const service = createService({
        compliance: {
          dataClassification: 'internal',
          auditLogging: true,
          encryption: {
            atRest: false,
            inTransit: true,
          },
        },
      });

      const result = await engine.preDeploymentCheck(service, 'production');
      const encryptionCheck = result.checks.find(c => c.name === 'Encryption');

      expect(encryptionCheck?.status).toBe('failed');
    });

    it('should fail when audit logging is disabled', async () => {
      const service = createService({
        compliance: {
          dataClassification: 'internal',
          auditLogging: false,
          encryption: { atRest: true, inTransit: true },
        },
      });

      const result = await engine.preDeploymentCheck(service, 'production');
      const auditCheck = result.checks.find(c => c.name === 'Audit Logging');

      expect(auditCheck?.status).toBe('failed');
    });

    it('should warn for restricted data classification', async () => {
      const service = createService({
        compliance: {
          dataClassification: 'restricted',
          auditLogging: true,
          encryption: { atRest: true, inTransit: true },
        },
      });

      const result = await engine.preDeploymentCheck(service, 'production');
      const classificationCheck = result.checks.find(c => c.name === 'Data Classification');

      expect(classificationCheck?.status).toBe('warning');
    });

    it('should warn for low replica count in production', async () => {
      const service = createService({
        config: {
          maxConcurrency: 10,
          timeoutMs: 30000,
          scaling: {
            minReplicas: 1,
            maxReplicas: 10,
            targetCPU: 70,
          },
        },
      });

      const result = await engine.preDeploymentCheck(service, 'production');
      const haCheck = result.checks.find(c => c.name === 'High Availability');

      expect(haCheck?.status).toBe('warning');
    });

    it('should warn for endpoints without authentication', async () => {
      const service = createService({
        endpoints: [
          { path: '/predict', method: 'POST', auth: false },
        ],
      });

      const result = await engine.preDeploymentCheck(service, 'production');
      const authCheck = result.checks.find(c => c.name === 'Authentication');

      expect(authCheck?.status).toBe('warning');
    });
  });

  describe('FedRAMP checks', () => {
    it('should include FedRAMP checks when certified', async () => {
      const service = createService({
        compliance: {
          dataClassification: 'confidential',
          auditLogging: true,
          encryption: { atRest: true, inTransit: true },
          certifications: ['fedramp'],
        },
      });

      const result = await engine.preDeploymentCheck(service, 'production');
      const fipsCheck = result.checks.find(c => c.name === 'FIPS 140-2 Encryption');

      expect(fipsCheck).toBeDefined();
      expect(fipsCheck?.control).toBe('SC-13');
    });
  });
});
