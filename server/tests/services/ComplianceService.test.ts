
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import complianceService, { ComplianceFramework } from '../../src/services/ComplianceService';
import { dlpService } from '../../src/services/DLPService';

// Mock dependencies
jest.mock('../../src/services/DLPService', () => ({
  dlpService: {
    listPolicies: jest.fn()
  }
}));

// Mock Redis
jest.mock('../../src/db/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  }))
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('ComplianceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ENCRYPTION_ENABLED = 'true';
    process.env.AUDIT_LOGGING_ENABLED = 'true';
    process.env.TLS_ENABLED = 'true';
    process.env.AUTH_REQUIRED = 'true';
    process.env.MFA_ENABLED = 'true';
    process.env.MONITORING_ENABLED = 'true';
    process.env.VULN_SCANNING_ENABLED = 'true';

    // Mock DLP policies
    (dlpService.listPolicies as jest.Mock).mockReturnValue([
      { id: 'pii-detection', name: 'PII Detection', enabled: true, updatedAt: new Date() },
      { id: 'data-classification', name: 'Data Classification', enabled: true, updatedAt: new Date() }
    ]);
  });

  describe('Framework Initialization', () => {
    it('should initialize default frameworks (GDPR, SOC2, ISO27001)', () => {
      const frameworks = complianceService.listFrameworks();
      expect(frameworks).toHaveLength(3);

      const ids = frameworks.map(f => f.id);
      expect(ids).toContain('gdpr');
      expect(ids).toContain('soc2');
      expect(ids).toContain('iso27001');
    });

    it('should retrieve a framework by ID', () => {
      const framework = complianceService.getFramework('gdpr');
      expect(framework).toBeDefined();
      expect(framework?.name).toContain('General Data Protection Regulation');
    });

    it('should return undefined for non-existent framework', () => {
      const framework = complianceService.getFramework('invalid-id');
      expect(framework).toBeUndefined();
    });
  });

  describe('Assessments', () => {
    it('should run GDPR assessment successfully when all controls are enabled', async () => {
      const report = await complianceService.runAssessment('gdpr');

      expect(report).toBeDefined();
      expect(report.frameworkId).toBe('gdpr');
      expect(report.status).toBe('compliant');
      expect(report.overallScore).toBe(100);
      expect(report.evidence.length).toBeGreaterThan(0);
    });

    it('should fail GDPR assessment if PII policy is missing', async () => {
      (dlpService.listPolicies as jest.Mock).mockReturnValue([]);

      const report = await complianceService.runAssessment('gdpr');

      expect(report.status).toBe('non-compliant');
      const piiFinding = report.findings.find(f => f.id === 'gdpr-art-25-no-pii-policy');
      expect(piiFinding).toBeDefined();
      expect(piiFinding?.severity).toBe('critical');
    });

    it('should fail SOC2 assessment if MFA is disabled', async () => {
      process.env.MFA_ENABLED = 'false';

      const report = await complianceService.runAssessment('soc2');

      expect(report.status).toBe('non-compliant');
      const mfaFinding = report.findings.find(f => f.id === 'soc2-cc-6.1-no-mfa');
      expect(mfaFinding).toBeDefined();
    });

    it('should handle generic requirements correctly', async () => {
      // Modify a framework to test generic path (mocking or manually modifying private state if possible,
      // but since we can't easily access private map, we rely on default generic fallback if any ID doesn't match specific cases)
      // The current implementation hardcodes switch cases for all default frameworks.
      // To test generic, we would need to add a custom framework.

      complianceService.updateFramework('gdpr', {
        requirements: [{
          id: 'custom-req',
          frameworkId: 'gdpr', // This triggers generic path if not in switch? No, assessRequirement switches on frameworkId
          // Wait, assessRequirement switches on frameworkId.
          // Inside assessGDPRRequirement, it switches on requirement.id.
          // If requirement.id is unknown, it falls back to assessGenericRequirement.
          category: 'Test',
          title: 'Test Generic',
          description: 'Generic Test',
          priority: 'medium',
          status: 'partial',
          controls: [{
             id: 'ctrl-1',
             type: 'technical',
             description: 'Auto Control',
             implementation: 'Impl',
             automated: true,
             effectiveness: 'high'
          }],
          evidence: [],
          nextCheck: new Date(),
          automatedCheck: true
        }]
      });

      const report = await complianceService.runAssessment('gdpr');
      // The custom requirement should be processed by assessGenericRequirement since its ID is not in the switch case in assessGDPRRequirement
      // Actually assessGDPRRequirement switch has a default case: return await this.assessGenericRequirement(requirement);

      const genericEvidence = report.evidence.find(e => e.metadata.controlId === 'ctrl-1');
      expect(genericEvidence).toBeDefined();
    });
  });

  describe('Dashboard Data', () => {
    it('should return dashboard data structure', async () => {
      const data = await complianceService.getDashboardData();

      expect(data.frameworks).toHaveLength(3);
      expect(data.overallStatus).toBeDefined();
      expect(data.upcomingAssessments).toBeDefined();
    });
  });
});
