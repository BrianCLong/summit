import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceLogger } from '../compliance/compliance-logger.js';
import type { Vulnerability, ScanConfig } from '../types.js';

describe('ComplianceLogger', () => {
  let logger: ComplianceLogger;

  beforeEach(() => {
    logger = new ComplianceLogger({
      serviceName: 'test-service',
      enableZeroTrust: true,
      retentionDays: 365,
    });
  });

  describe('audit trail', () => {
    it('should create tamper-evident audit entries', async () => {
      await logger.logAction('scan-1', 'test-action', { data: 'test' });
      const trail = await logger.getAuditTrail();

      expect(trail.length).toBe(1);
      expect(trail[0].action).toBe('TEST_ACTION');
      expect(trail[0].hash).toBeDefined();
      expect(trail[0].previousHash).toBeDefined();
    });

    it('should chain hashes correctly', async () => {
      await logger.logAction('scan-1', 'action-1', { step: 1 });
      await logger.logAction('scan-1', 'action-2', { step: 2 });
      const trail = await logger.getAuditTrail();

      expect(trail.length).toBe(2);
      expect(trail[1].previousHash).toBe(trail[0].hash);
    });

    it('should verify chain integrity', async () => {
      await logger.logAction('scan-1', 'action-1', {});
      await logger.logAction('scan-1', 'action-2', {});
      await logger.logAction('scan-1', 'action-3', {});

      const result = await logger.verifyChainIntegrity();
      expect(result.valid).toBe(true);
    });
  });

  describe('scan logging', () => {
    it('should log scan start', async () => {
      const config: ScanConfig = {
        targetPaths: ['src/'],
        excludePaths: [],
        scanTypes: ['static-analysis'],
        severityThreshold: 'low',
        enableAIAnalysis: false,
        enableRedTeam: false,
        complianceFrameworks: ['NIST'],
        maxConcurrency: 5,
        timeout: 60000,
      };

      await logger.logScanStart('scan-123', '/path/to/scan', config);
      const trail = await logger.getAuditTrail('scan-123');

      expect(trail.length).toBe(1);
      expect(trail[0].action).toBe('SCAN_INITIATED');
    });

    it('should log vulnerability detection', async () => {
      const vuln: Vulnerability = {
        id: 'VULN-001',
        title: 'Test Vulnerability',
        description: 'Test description',
        severity: 'high',
        category: 'injection',
        cvssScore: 7.5,
        location: {
          file: 'test.ts',
          startLine: 10,
          endLine: 15,
          codeSnippet: 'test code',
        },
        attribution: {
          source: 'static-analysis',
          confidence: 0.9,
          scanId: 'scan-123',
          timestamp: new Date(),
        },
        evidence: [],
        remediation: {
          description: 'Fix the issue',
          priority: 'high',
          estimatedEffort: '1 hour',
          automatable: true,
          verificationSteps: ['Step 1'],
        },
        complianceImpact: [
          {
            framework: 'NIST',
            control: 'SI-10',
            impact: 'violation',
            description: 'Input validation issue',
          },
        ],
        detectedAt: new Date(),
        status: 'open',
      };

      await logger.logVulnerabilityDetected('scan-123', vuln);
      const trail = await logger.getAuditTrail();

      // Should have vulnerability detection + compliance event
      expect(trail.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('compliance reporting', () => {
    it('should export compliance report for framework', async () => {
      await logger.logComplianceEvent({
        eventType: 'control-check',
        severity: 'info',
        framework: 'NIST',
        control: 'SI-10',
        status: 'compliant',
        details: {},
      });

      const report = await logger.exportComplianceReport('NIST');

      expect(report.framework).toBe('NIST');
      expect(report.chainIntegrity).toBe(true);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });
  });
});
