import { describe, it, expect, beforeEach } from '@jest/globals';
import { ComplianceService } from '../services/ComplianceService.js';
import { DataAsset } from '@intelgraph/data-monetization-types';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let testAsset: DataAsset;

  beforeEach(() => {
    service = new ComplianceService();
    testAsset = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Customer Data',
      description: 'Customer contact information',
      category: 'DEMOGRAPHIC',
      qualityLevel: 'CURATED',
      sensitivityLevel: 'CONFIDENTIAL',
      sourceSystem: 'CRM',
      schema: {
        email: 'string',
        phone: 'string',
        first_name: 'string',
        last_name: 'string',
        birth_date: 'date',
        address: 'string',
      },
      metadata: {
        recordCount: 100000,
        sizeBytes: 50000000,
        lastUpdated: new Date().toISOString(),
      },
      tags: ['customer', 'pii'],
      owner: 'data-team',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  describe('checkCompliance', () => {
    it('should detect PII in schema fields', async () => {
      const checks = await service.checkCompliance(testAsset, ['GDPR'], false);

      expect(checks).toHaveLength(1);
      expect(checks[0].framework).toBe('GDPR');
      expect(checks[0].piiDetected.length).toBeGreaterThan(0);
      expect(checks[0].piiDetected).toContain('DIRECT_IDENTIFIER');
    });

    it('should check multiple frameworks', async () => {
      const checks = await service.checkCompliance(
        testAsset,
        ['GDPR', 'CCPA', 'HIPAA'],
        false,
      );

      expect(checks).toHaveLength(3);
      expect(checks.map((c) => c.framework)).toEqual(['GDPR', 'CCPA', 'HIPAA']);
    });

    it('should identify consent requirements for sensitive data', async () => {
      const checks = await service.checkCompliance(testAsset, ['GDPR'], false);

      expect(checks[0].consentRequirements.length).toBeGreaterThan(0);
    });

    it('should flag public assets with PII as critical', async () => {
      const publicAssetWithPII: DataAsset = {
        ...testAsset,
        sensitivityLevel: 'PUBLIC',
      };

      const checks = await service.checkCompliance(publicAssetWithPII, ['GDPR'], false);

      const criticalFindings = checks[0].findings.filter(
        (f) => f.severity === 'CRITICAL',
      );
      expect(criticalFindings.length).toBeGreaterThan(0);
      expect(checks[0].status).toBe('FAILED');
    });

    it('should pass for clean public data', async () => {
      const cleanAsset: DataAsset = {
        ...testAsset,
        sensitivityLevel: 'PUBLIC',
        schema: {
          product_id: 'string',
          price: 'number',
          quantity: 'number',
        },
      };

      const checks = await service.checkCompliance(cleanAsset, ['SOC2'], false);

      expect(checks[0].status).toBe('PASSED');
    });
  });

  describe('getSupportedFrameworks', () => {
    it('should return all supported frameworks', () => {
      const frameworks = service.getSupportedFrameworks();

      expect(frameworks).toContain('GDPR');
      expect(frameworks).toContain('CCPA');
      expect(frameworks).toContain('HIPAA');
      expect(frameworks).toContain('SOC2');
      expect(frameworks).toContain('ISO27001');
      expect(frameworks).toContain('FEDRAMP');
      expect(frameworks).toContain('PCI_DSS');
      expect(frameworks.length).toBe(9);
    });
  });

  describe('generateComplianceSummary', () => {
    it('should generate correct summary for passed checks', async () => {
      const cleanAsset: DataAsset = {
        ...testAsset,
        sensitivityLevel: 'PUBLIC',
        schema: { id: 'string', value: 'number' },
      };

      const checks = await service.checkCompliance(cleanAsset, ['SOC2'], false);
      const summary = service.generateComplianceSummary(checks);

      expect(summary.overallStatus).toBe('PASSED');
      expect(summary.passRate).toBe(100);
      expect(summary.criticalFindings).toBe(0);
    });

    it('should generate correct summary for failed checks', async () => {
      const riskyAsset: DataAsset = {
        ...testAsset,
        sensitivityLevel: 'PUBLIC',
      };

      const checks = await service.checkCompliance(riskyAsset, ['GDPR'], false);
      const summary = service.generateComplianceSummary(checks);

      expect(summary.overallStatus).toBe('FAILED');
      expect(summary.criticalFindings).toBeGreaterThan(0);
    });
  });
});
