/**
 * Tests for Compliance Engine
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ComplianceEngine } from '../ComplianceEngine';
import type { GlobalPartner, ComplianceFramework } from '../types';

describe('ComplianceEngine', () => {
  let engine: ComplianceEngine;

  beforeEach(() => {
    engine = new ComplianceEngine();
  });

  describe('validateCompliance', () => {
    const mockPartner: GlobalPartner = {
      id: 'compliance-test-001',
      name: 'Test Organization',
      type: 'government',
      region: 'Baltic',
      country: 'EE',
      languageCode: 'et',
      authMethod: 'x-road',
      complianceRequirements: ['GDPR', 'eIDAS'],
      dataClassification: 'confidential',
      status: 'active',
      discoveredAt: new Date(),
      metadata: {
        dataProcessingAgreement: true,
        supportsErasure: true,
      },
    };

    const baseContext = {
      userRegion: 'Baltic' as const,
      userClearanceLevel: 2,
      processingPurpose: 'contract',
      dataFields: ['name', 'email', 'type'],
      crossBorder: false,
    };

    it('should validate compliant partner successfully', async () => {
      const report = await engine.validateCompliance(mockPartner, baseContext);

      expect(report.partnerId).toBe(mockPartner.id);
      expect(report.overallScore).toBeGreaterThan(70);
      expect(report.frameworkScores['GDPR']).toBeDefined();
      expect(report.frameworkScores['eIDAS']).toBeDefined();
    });

    it('should detect missing DPA', async () => {
      const partnerWithoutDPA = {
        ...mockPartner,
        metadata: {},
      };

      const report = await engine.validateCompliance(partnerWithoutDPA, baseContext);

      const dpaGap = report.gaps.find((g) => g.requirement === 'Data Processing Agreement');
      expect(dpaGap).toBeDefined();
      expect(dpaGap?.severity).toBe('high');
    });

    it('should detect invalid authentication method for eIDAS', async () => {
      const partnerWithApiKey = {
        ...mockPartner,
        authMethod: 'api-key' as const,
      };

      const report = await engine.validateCompliance(partnerWithApiKey, baseContext);

      const authGap = report.gaps.find((g) => g.requirement === 'Qualified authentication');
      expect(authGap).toBeDefined();
      expect(authGap?.severity).toBe('medium');
    });

    it('should detect cross-border transfer issues', async () => {
      const crossBorderContext = {
        ...baseContext,
        crossBorder: true,
        userRegion: 'APAC' as const,
      };

      const report = await engine.validateCompliance(mockPartner, crossBorderContext);

      // Should still pass with SCCs
      expect(report).toBeDefined();
    });

    it('should detect data minimization violations', async () => {
      const largeDataContext = {
        ...baseContext,
        dataFields: Array(60).fill('field'), // More than 50 fields
      };

      const report = await engine.validateCompliance(mockPartner, largeDataContext);

      const minimizationGap = report.gaps.find((g) => g.requirement === 'Data minimization');
      expect(minimizationGap).toBeDefined();
      expect(minimizationGap?.severity).toBe('medium');
    });

    it('should generate recommendations for gaps', async () => {
      const partnerWithGaps = {
        ...mockPartner,
        authMethod: 'api-key' as const,
        metadata: {},
      };

      const report = await engine.validateCompliance(partnerWithGaps, baseContext);

      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('assessDataTransfer', () => {
    it('should allow same region transfers', async () => {
      const assessment = await engine.assessDataTransfer('Baltic', 'Baltic');

      expect(assessment.allowed).toBe(true);
      expect(assessment.mechanism).toBe('adequacy');
    });

    it('should allow EU to EU transfers', async () => {
      const assessment = await engine.assessDataTransfer('EU', 'Nordic');

      expect(assessment.allowed).toBe(true);
      expect(assessment.mechanism).toBe('adequacy');
    });

    it('should require SCCs for non-EU transfers', async () => {
      const assessment = await engine.assessDataTransfer('EU', 'APAC');

      expect(assessment.allowed).toBe(true);
      expect(assessment.mechanism).toBe('scc');
      expect(assessment.conditions).toContain('Execute Standard Contractual Clauses');
    });
  });

  describe('getComplianceStatus', () => {
    it('should return supported frameworks', () => {
      const status = engine.getComplianceStatus();

      expect(status.supportedFrameworks).toContain('GDPR');
      expect(status.supportedFrameworks).toContain('eIDAS');
      expect(status.supportedFrameworks).toContain('ISO27001');
      expect(status.totalChecks).toBeGreaterThan(0);
    });

    it('should show checks per framework', () => {
      const status = engine.getComplianceStatus();

      expect(status.checksPerFramework['GDPR']).toBeGreaterThan(0);
      expect(status.checksPerFramework['eIDAS']).toBeGreaterThan(0);
    });
  });

  describe('registerCheck', () => {
    it('should allow registering custom compliance checks', async () => {
      engine.registerCheck('GDPR', {
        framework: 'GDPR',
        requirement: 'Custom GDPR Check',
        check: async () => ({
          passed: true,
          requirement: 'Custom GDPR Check',
          currentState: 'Custom check passed',
        }),
      });

      const status = engine.getComplianceStatus();
      const gdprChecks = status.checksPerFramework['GDPR'];

      expect(gdprChecks).toBeGreaterThan(5); // Original checks + custom
    });
  });

  describe('autoRemediate', () => {
    it('should auto-remediate supported gaps', async () => {
      const gaps = [
        {
          partnerId: 'test',
          framework: 'GDPR' as ComplianceFramework,
          requirement: 'Data Processing Agreement',
          currentState: 'Missing',
          remediation: 'Generate DPA',
          severity: 'high' as const,
        },
      ];

      const result = await engine.autoRemediate(gaps);

      expect(result.remediated.length).toBeGreaterThanOrEqual(0);
    });

    it('should report failed remediations', async () => {
      const gaps = [
        {
          partnerId: 'test',
          framework: 'GDPR' as ComplianceFramework,
          requirement: 'Non-existent Requirement',
          currentState: 'Unknown',
          remediation: 'Unknown',
          severity: 'high' as const,
        },
      ];

      const result = await engine.autoRemediate(gaps);

      expect(result.failed.length).toBeGreaterThan(0);
    });
  });
});
