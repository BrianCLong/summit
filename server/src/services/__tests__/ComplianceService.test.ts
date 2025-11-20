/**
 * ComplianceService Test Suite
 *
 * Tests for:
 * - Compliance framework initialization (GDPR, SOC 2, ISO 27001)
 * - Automated compliance assessments
 * - Requirement-specific validation
 * - Finding and recommendation generation
 * - Evidence collection
 * - Compliance scoring
 * - Report caching
 * - Dashboard data aggregation
 * - Framework configuration updates
 */

import { jest } from '@jest/globals';
import { complianceService } from '../ComplianceService';
import type { ComplianceFramework, ComplianceReport } from '../ComplianceService';

// Mock dependencies
jest.mock('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../utils/CircuitBreaker.js', () => ({
  CircuitBreaker: jest.fn(() => ({
    execute: jest.fn((fn) => fn()),
  })),
}));

jest.mock('../db/redis.js', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

jest.mock('../services/DLPService.js', () => ({
  dlpService: {
    listPolicies: jest.fn(() => [
      {
        id: 'pii-detection',
        name: 'PII Detection',
        enabled: true,
        updatedAt: new Date(),
      },
    ]),
  },
}));

describe('ComplianceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables to default compliant state
    process.env.ENCRYPTION_ENABLED = 'true';
    process.env.AUDIT_LOGGING_ENABLED = 'true';
    process.env.TLS_ENABLED = 'true';
    process.env.AUTH_REQUIRED = 'true';
    process.env.MFA_ENABLED = 'true';
    process.env.RBAC_ENABLED = 'true';
    process.env.MONITORING_ENABLED = 'true';
    process.env.VULN_SCANNING_ENABLED = 'true';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ENCRYPTION_ENABLED;
    delete process.env.AUDIT_LOGGING_ENABLED;
    delete process.env.TLS_ENABLED;
    delete process.env.AUTH_REQUIRED;
    delete process.env.MFA_ENABLED;
    delete process.env.RBAC_ENABLED;
    delete process.env.MONITORING_ENABLED;
    delete process.env.VULN_SCANNING_ENABLED;
  });

  describe('Initialization', () => {
    it('should initialize with GDPR framework', () => {
      const gdpr = complianceService.getFramework('gdpr');

      expect(gdpr).toBeDefined();
      expect(gdpr?.name).toBe('General Data Protection Regulation');
      expect(gdpr?.enabled).toBe(true);
      expect(gdpr?.requirements.length).toBeGreaterThan(0);
    });

    it('should initialize with SOC 2 framework', () => {
      const soc2 = complianceService.getFramework('soc2');

      expect(soc2).toBeDefined();
      expect(soc2?.name).toBe('SOC 2 Type II');
      expect(soc2?.enabled).toBe(true);
      expect(soc2?.requirements.length).toBeGreaterThan(0);
    });

    it('should initialize with ISO 27001 framework', () => {
      const iso27001 = complianceService.getFramework('iso27001');

      expect(iso27001).toBeDefined();
      expect(iso27001?.name).toBe('ISO 27001:2022');
      expect(iso27001?.enabled).toBe(true);
      expect(iso27001?.requirements.length).toBeGreaterThan(0);
    });

    it('should list all frameworks', () => {
      const frameworks = complianceService.listFrameworks();

      expect(frameworks.length).toBe(3);
      expect(frameworks.map((f) => f.id)).toEqual(
        expect.arrayContaining(['gdpr', 'soc2', 'iso27001']),
      );
    });

    it('should initialize frameworks with proper assessment schedules', () => {
      const frameworks = complianceService.listFrameworks();

      frameworks.forEach((framework) => {
        expect(framework.nextAssessment).toBeInstanceOf(Date);
        expect(framework.nextAssessment.getTime()).toBeGreaterThan(Date.now());
        expect(framework.assessmentFrequency).toMatch(
          /^(daily|weekly|monthly|quarterly|annually)$/,
        );
      });
    });
  });

  describe('runAssessment - GDPR', () => {
    it('should run GDPR assessment successfully when compliant', async () => {
      const report = await complianceService.runAssessment('gdpr');

      expect(report).toBeDefined();
      expect(report.frameworkId).toBe('gdpr');
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.summary.totalRequirements).toBeGreaterThan(0);
    });

    it('should detect missing PII protection', async () => {
      const { dlpService } = await import('../services/DLPService.js');
      (dlpService.listPolicies as jest.Mock).mockReturnValue([]);

      const report = await complianceService.runAssessment('gdpr');

      expect(report.findings.some((f) => f.id === 'gdpr-art-25-no-pii-policy')).toBe(
        true,
      );
      expect(
        report.findings.some((f) => f.severity === 'critical'),
      ).toBe(true);
    });

    it('should detect disabled encryption', async () => {
      process.env.ENCRYPTION_ENABLED = 'false';

      const report = await complianceService.runAssessment('gdpr');

      expect(
        report.findings.some((f) => f.id === 'gdpr-art-25-no-encryption'),
      ).toBe(true);
      expect(report.findings.some((f) => f.severity === 'high')).toBe(true);
    });

    it('should detect disabled audit logging', async () => {
      process.env.AUDIT_LOGGING_ENABLED = 'false';

      const report = await complianceService.runAssessment('gdpr');

      expect(
        report.findings.some((f) => f.id === 'gdpr-art-30-no-audit-logs'),
      ).toBe(true);
    });

    it('should detect disabled TLS', async () => {
      process.env.TLS_ENABLED = 'false';

      const report = await complianceService.runAssessment('gdpr');

      expect(report.findings.some((f) => f.id === 'gdpr-art-32-no-tls')).toBe(
        true,
      );
      expect(report.status).toBe('non-compliant');
    });

    it('should detect missing authentication', async () => {
      process.env.AUTH_REQUIRED = 'false';

      const report = await complianceService.runAssessment('gdpr');

      expect(report.findings.some((f) => f.id === 'gdpr-art-32-no-auth')).toBe(
        true,
      );
      expect(report.findings.some((f) => f.severity === 'critical')).toBe(true);
    });

    it('should calculate overall score correctly', async () => {
      // All compliant
      const report = await complianceService.runAssessment('gdpr');

      expect(report.overallScore).toBeGreaterThanOrEqual(80);
      expect(report.status).toBe('compliant');
    });

    it('should mark as non-compliant when score is low', async () => {
      // Disable multiple critical controls
      process.env.ENCRYPTION_ENABLED = 'false';
      process.env.TLS_ENABLED = 'false';
      process.env.AUTH_REQUIRED = 'false';

      const report = await complianceService.runAssessment('gdpr');

      expect(report.overallScore).toBeLessThan(80);
      expect(report.status).toBe('non-compliant');
    });

    it('should collect evidence for compliant requirements', async () => {
      const report = await complianceService.runAssessment('gdpr');

      expect(report.evidence.length).toBeGreaterThan(0);
      expect(
        report.evidence.some((e) => e.type === 'audit-trail'),
      ).toBe(true);
    });

    it('should update framework status after assessment', async () => {
      await complianceService.runAssessment('gdpr');

      const framework = complianceService.getFramework('gdpr');
      expect(framework?.lastAssessment).toBeInstanceOf(Date);
      expect(framework?.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runAssessment - SOC 2', () => {
    it('should run SOC 2 assessment successfully', async () => {
      const report = await complianceService.runAssessment('soc2');

      expect(report).toBeDefined();
      expect(report.frameworkId).toBe('soc2');
      expect(report.summary.totalRequirements).toBeGreaterThan(0);
    });

    it('should detect missing MFA', async () => {
      process.env.MFA_ENABLED = 'false';

      const report = await complianceService.runAssessment('soc2');

      expect(report.findings.some((f) => f.id === 'soc2-cc-6.1-no-mfa')).toBe(
        true,
      );
      expect(report.findings.some((f) => f.severity === 'critical')).toBe(true);
    });

    it('should detect missing RBAC', async () => {
      process.env.RBAC_ENABLED = 'false';

      const report = await complianceService.runAssessment('soc2');

      expect(report.findings.some((f) => f.id === 'soc2-cc-6.1-no-rbac')).toBe(
        true,
      );
    });

    it('should detect disabled monitoring', async () => {
      process.env.MONITORING_ENABLED = 'false';

      const report = await complianceService.runAssessment('soc2');

      expect(
        report.findings.some((f) => f.id === 'soc2-cc-7.1-no-monitoring'),
      ).toBe(true);
      expect(report.findings.some((f) => f.severity === 'medium')).toBe(true);
    });

    it('should mark as compliant when all controls pass', async () => {
      const report = await complianceService.runAssessment('soc2');

      expect(report.overallScore).toBeGreaterThanOrEqual(80);
      expect(report.status).toBe('compliant');
    });
  });

  describe('runAssessment - ISO 27001', () => {
    it('should run ISO 27001 assessment successfully', async () => {
      const report = await complianceService.runAssessment('iso27001');

      expect(report).toBeDefined();
      expect(report.frameworkId).toBe('iso27001');
      expect(report.summary.totalRequirements).toBeGreaterThan(0);
    });

    it('should detect missing data classification policies', async () => {
      const { dlpService } = await import('../services/DLPService.js');
      (dlpService.listPolicies as jest.Mock).mockReturnValue([]);

      const report = await complianceService.runAssessment('iso27001');

      expect(
        report.findings.some((f) => f.id === 'iso27001-a-8-2-no-classification'),
      ).toBe(true);
    });

    it('should detect disabled vulnerability scanning', async () => {
      process.env.VULN_SCANNING_ENABLED = 'false';

      const report = await complianceService.runAssessment('iso27001');

      expect(
        report.findings.some((f) => f.id === 'iso27001-a-12-6-no-vuln-scan'),
      ).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate remediation recommendations', async () => {
      process.env.VULN_SCANNING_ENABLED = 'false';

      const report = await complianceService.runAssessment('iso27001');

      const recommendation = report.recommendations.find(
        (r) => r.id === 'iso27001-a-12-6-enable-vuln-scan',
      );
      expect(recommendation).toBeDefined();
      expect(recommendation?.priority).toBe('high');
      expect(recommendation?.timeline).toBe('2 weeks');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown framework', async () => {
      await expect(
        complianceService.runAssessment('unknown-framework'),
      ).rejects.toThrow('Framework not found');
    });

    it('should handle assessment errors gracefully', async () => {
      // Mock circuit breaker to throw
      const { CircuitBreaker } = await import('../utils/CircuitBreaker.js');
      (CircuitBreaker as jest.Mock).mockImplementation(() => ({
        execute: jest.fn(() => {
          throw new Error('Circuit breaker tripped');
        }),
      }));

      await expect(complianceService.runAssessment('gdpr')).rejects.toThrow(
        'Circuit breaker tripped',
      );
    });
  });

  describe('Report Generation', () => {
    it('should generate report with correct structure', async () => {
      const report = await complianceService.runAssessment('gdpr');

      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.reportPeriod).toBeDefined();
      expect(report.reportPeriod.startDate).toBeInstanceOf(Date);
      expect(report.reportPeriod.endDate).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.findings).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.evidence).toBeInstanceOf(Array);
    });

    it('should include summary statistics', async () => {
      const report = await complianceService.runAssessment('gdpr');

      expect(report.summary.totalRequirements).toBeGreaterThan(0);
      expect(typeof report.summary.compliantRequirements).toBe('number');
      expect(typeof report.summary.nonCompliantRequirements).toBe('number');
      expect(typeof report.summary.partialRequirements).toBe('number');

      // Verify totals add up
      const sum =
        report.summary.compliantRequirements +
        report.summary.nonCompliantRequirements +
        report.summary.partialRequirements;
      expect(sum).toBe(report.summary.totalRequirements);
    });

    it('should generate report ID with framework and timestamp', async () => {
      const report = await complianceService.runAssessment('gdpr');

      expect(report.id).toMatch(/^gdpr-\d+$/);
    });

    it('should include all findings with required fields', async () => {
      process.env.ENCRYPTION_ENABLED = 'false';
      const report = await complianceService.runAssessment('gdpr');

      report.findings.forEach((finding) => {
        expect(finding.id).toBeDefined();
        expect(finding.requirementId).toBeDefined();
        expect(finding.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(finding.title).toBeDefined();
        expect(finding.description).toBeDefined();
        expect(finding.detectedAt).toBeInstanceOf(Date);
        expect(finding.status).toMatch(/^(open|in-progress|resolved|accepted)$/);
        expect(finding.riskRating).toBeGreaterThanOrEqual(1);
        expect(finding.riskRating).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Dashboard Data', () => {
    it('should generate dashboard data', async () => {
      const dashboard = await complianceService.getDashboardData();

      expect(dashboard.overallStatus).toMatch(
        /^(compliant|non-compliant|pending)$/,
      );
      expect(dashboard.frameworks.length).toBe(3);
      expect(dashboard.recentFindings).toBeInstanceOf(Array);
      expect(dashboard.upcomingAssessments).toBeInstanceOf(Array);
    });

    it('should include framework summaries', async () => {
      const dashboard = await complianceService.getDashboardData();

      dashboard.frameworks.forEach((framework) => {
        expect(framework.id).toBeDefined();
        expect(framework.name).toBeDefined();
        expect(framework.status).toBeDefined();
        expect(typeof framework.score).toBe('number');
        expect(framework.nextAssessment).toBeInstanceOf(Date);
      });
    });

    it('should calculate overall status correctly', async () => {
      // All frameworks compliant
      await complianceService.runAssessment('gdpr');
      await complianceService.runAssessment('soc2');
      await complianceService.runAssessment('iso27001');

      const dashboard = await complianceService.getDashboardData();

      expect(dashboard.overallStatus).toMatch(/^(compliant|pending)$/);
    });

    it('should sort upcoming assessments by date', async () => {
      const dashboard = await complianceService.getDashboardData();

      if (dashboard.upcomingAssessments.length > 1) {
        for (let i = 0; i < dashboard.upcomingAssessments.length - 1; i++) {
          const current = dashboard.upcomingAssessments[i].nextAssessment;
          const next = dashboard.upcomingAssessments[i + 1].nextAssessment;
          expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
      }
    });

    it('should limit upcoming assessments to 5', async () => {
      const dashboard = await complianceService.getDashboardData();

      expect(dashboard.upcomingAssessments.length).toBeLessThanOrEqual(5);
    });

    it('should limit recent findings to 10', async () => {
      const dashboard = await complianceService.getDashboardData();

      expect(dashboard.recentFindings.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Framework Management', () => {
    it('should update framework configuration', () => {
      const result = complianceService.updateFramework('gdpr', {
        enabled: false,
      });

      expect(result).toBe(true);

      const framework = complianceService.getFramework('gdpr');
      expect(framework?.enabled).toBe(false);
    });

    it('should return false when updating unknown framework', () => {
      const result = complianceService.updateFramework('unknown', {
        enabled: false,
      });

      expect(result).toBe(false);
    });

    it('should preserve other framework properties when updating', () => {
      const originalFramework = complianceService.getFramework('gdpr');
      const originalName = originalFramework?.name;

      complianceService.updateFramework('gdpr', {
        assessmentFrequency: 'weekly',
      });

      const updatedFramework = complianceService.getFramework('gdpr');
      expect(updatedFramework?.name).toBe(originalName);
      expect(updatedFramework?.assessmentFrequency).toBe('weekly');
    });
  });

  describe('Report Caching', () => {
    it('should cache reports after generation', async () => {
      const { getRedisClient } = await import('../db/redis.js');
      const mockSet = jest.fn();
      (getRedisClient as jest.Mock).mockReturnValue({ set: mockSet });

      const report = await complianceService.runAssessment('gdpr');

      expect(mockSet).toHaveBeenCalledWith(
        expect.stringContaining(`compliance:report:${report.id}`),
        expect.any(String),
        'EX',
        604800, // 7 days
      );
    });

    it('should retrieve cached reports', async () => {
      const mockReport: ComplianceReport = {
        id: 'test-report-123',
        frameworkId: 'gdpr',
        generatedAt: new Date(),
        reportPeriod: {
          startDate: new Date(),
          endDate: new Date(),
        },
        overallScore: 85,
        status: 'compliant',
        summary: {
          totalRequirements: 10,
          compliantRequirements: 8,
          nonCompliantRequirements: 1,
          partialRequirements: 1,
        },
        findings: [],
        recommendations: [],
        evidence: [],
      };

      const { getRedisClient } = await import('../db/redis.js');
      (getRedisClient as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(JSON.stringify(mockReport)),
      });

      const retrieved = await complianceService.getReport('test-report-123');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-report-123');
    });

    it('should return null for non-existent report', async () => {
      const { getRedisClient } = await import('../db/redis.js');
      (getRedisClient as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
      });

      const retrieved = await complianceService.getReport('non-existent');

      expect(retrieved).toBeNull();
    });
  });
});
