import { describe, it, expect, beforeEach } from 'vitest';
import { VulnerabilityAttributor } from '../attribution/vulnerability-attributor.js';
import type { Vulnerability } from '../types.js';

describe('VulnerabilityAttributor', () => {
  let attributor: VulnerabilityAttributor;

  beforeEach(() => {
    attributor = new VulnerabilityAttributor({
      enableAIAnalysis: false,
      enableThreatIntel: false,
      correlationWindow: 86400000,
      minConfidence: 0.7,
    });
  });

  const createTestVuln = (overrides: Partial<Vulnerability> = {}): Vulnerability => ({
    id: 'TEST-001',
    title: 'Test Vulnerability',
    description: 'A test vulnerability',
    severity: 'high',
    category: 'injection',
    cvssScore: 7.5,
    location: {
      file: '/home/user/summit/services/test/src/handler.ts',
      startLine: 10,
      endLine: 15,
      codeSnippet: 'const query = req.body.input;',
    },
    attribution: {
      source: 'static-analysis',
      confidence: 0.85,
      scanId: 'scan-123',
      timestamp: new Date(),
    },
    evidence: [],
    remediation: {
      description: 'Sanitize input',
      priority: 'high',
      estimatedEffort: '2 hours',
      automatable: true,
      verificationSteps: ['Test with malicious input'],
    },
    complianceImpact: [],
    detectedAt: new Date(),
    status: 'open',
    ...overrides,
  });

  describe('attribution', () => {
    it('should attribute a vulnerability', async () => {
      const vuln = createTestVuln();
      const result = await attributor.attributeVulnerability(vuln);

      expect(result.vulnerabilityId).toBe(vuln.id);
      expect(result.attribution).toBeDefined();
      expect(result.attribution.rootCauseAnalysis).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
    });

    it('should perform root cause analysis', async () => {
      const vuln = createTestVuln({
        location: {
          file: '/test.ts',
          startLine: 1,
          endLine: 5,
          codeSnippet: 'const query = req.body.user input;',
        },
      });

      const result = await attributor.attributeVulnerability(vuln);

      expect(result.attribution.rootCauseAnalysis.primaryCause).toBeDefined();
      expect(Array.isArray(result.attribution.rootCauseAnalysis.contributingFactors)).toBe(true);
    });

    it('should map to MITRE ATT&CK', async () => {
      const vuln = createTestVuln({ category: 'injection' });
      const result = await attributor.attributeVulnerability(vuln);

      expect(result.attribution.mitreTactics).toBeDefined();
      expect(Array.isArray(result.attribution.mitreTactics)).toBe(true);
    });

    it('should build attack chain', async () => {
      const vuln = createTestVuln();
      const result = await attributor.attributeVulnerability(vuln);

      expect(result.attribution.attackChain).toBeDefined();
      expect(Array.isArray(result.attribution.attackChain)).toBe(true);
      if (result.attribution.attackChain && result.attribution.attackChain.length > 0) {
        expect(result.attribution.attackChain[0].step).toBe(1);
      }
    });
  });

  describe('batch attribution', () => {
    it('should attribute multiple vulnerabilities', async () => {
      const vulns = [
        createTestVuln({ id: 'VULN-1' }),
        createTestVuln({ id: 'VULN-2', category: 'authentication' }),
        createTestVuln({ id: 'VULN-3', category: 'cryptographic' }),
      ];

      const results = await attributor.attributeVulnerabilities(vulns);

      expect(results.length).toBe(3);
      results.forEach((result, index) => {
        expect(result.vulnerabilityId).toBe(vulns[index].id);
      });
    });
  });

  describe('risk assessment', () => {
    it('should calculate overall risk', async () => {
      const vuln = createTestVuln({ severity: 'critical', cvssScore: 9.5 });
      const result = await attributor.attributeVulnerability(vuln);

      expect(result.riskAssessment.overallRisk).toBeGreaterThan(0);
      expect(result.riskAssessment.overallRisk).toBeLessThanOrEqual(100);
    });

    it('should include risk factors', async () => {
      const vuln = createTestVuln();
      const result = await attributor.attributeVulnerability(vuln);

      expect(Array.isArray(result.riskAssessment.factors)).toBe(true);
      expect(result.riskAssessment.factors.length).toBeGreaterThan(0);
    });

    it('should calculate exploitability and impact', async () => {
      const vuln = createTestVuln();
      const result = await attributor.attributeVulnerability(vuln);

      expect(result.riskAssessment.exploitability).toBeGreaterThanOrEqual(0);
      expect(result.riskAssessment.impact).toBeGreaterThanOrEqual(0);
      expect(result.riskAssessment.likelihood).toBeGreaterThanOrEqual(0);
    });
  });

  describe('correlation', () => {
    it('should correlate related vulnerabilities', async () => {
      // First vulnerability
      const vuln1 = createTestVuln({ id: 'VULN-A' });
      await attributor.attributeVulnerability(vuln1);

      // Second vulnerability in same file
      const vuln2 = createTestVuln({ id: 'VULN-B' });
      const result = await attributor.attributeVulnerability(vuln2);

      expect(Array.isArray(result.correlatedVulnerabilities)).toBe(true);
    });
  });

  describe('timeline', () => {
    it('should build vulnerability timeline', async () => {
      const vuln = createTestVuln();
      const result = await attributor.attributeVulnerability(vuln);

      expect(Array.isArray(result.timeline)).toBe(true);
      expect(result.timeline.length).toBeGreaterThan(0);
      expect(result.timeline[0].event).toBe('Vulnerability detected');
    });
  });
});
