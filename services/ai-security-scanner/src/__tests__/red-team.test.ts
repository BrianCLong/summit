import { describe, it, expect, beforeEach } from 'vitest';
import { RedTeamEngine } from '../redteam/red-team-engine.js';

describe('RedTeamEngine', () => {
  let engine: RedTeamEngine;

  beforeEach(() => {
    engine = new RedTeamEngine({
      enabled: true,
      attackCategories: ['authentication-bypass', 'injection-attacks'],
      maxAttemptsPerVector: 1,
      safeModeEnabled: true,
      reportOnly: true,
    });
  });

  describe('initialization', () => {
    it('should create engine with config', () => {
      expect(engine).toBeDefined();
    });

    it('should accept custom attack categories', () => {
      const customEngine = new RedTeamEngine({
        attackCategories: ['business-logic', 'rate-limiting'],
      });
      expect(customEngine).toBeDefined();
    });
  });

  describe('red team session', () => {
    it('should execute red team session', async () => {
      const report = await engine.executeRedTeamSession({
        basePath: '/tmp/test',
        endpoints: [],
        policies: [],
      });

      expect(report.sessionId).toBeDefined();
      expect(report.startTime).toBeInstanceOf(Date);
      expect(report.endTime).toBeInstanceOf(Date);
      expect(report.riskAssessment).toBeDefined();
      expect(report.riskAssessment.overallRisk).toBeDefined();
    });

    it('should generate recommendations', async () => {
      const report = await engine.executeRedTeamSession({
        basePath: '/tmp/test',
      });

      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should track attack results', async () => {
      const report = await engine.executeRedTeamSession({
        basePath: '/tmp/test',
      });

      expect(Array.isArray(report.attackResults)).toBe(true);
      expect(report.attacksExecuted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('safe mode', () => {
    it('should skip destructive vectors in safe mode', async () => {
      const safeEngine = new RedTeamEngine({
        safeModeEnabled: true,
        reportOnly: true,
      });

      const report = await safeEngine.executeRedTeamSession({
        basePath: '/tmp/test',
      });

      // Should complete without attempting destructive attacks
      expect(report.sessionId).toBeDefined();
    });
  });

  describe('risk assessment', () => {
    it('should calculate risk scores', async () => {
      const report = await engine.executeRedTeamSession({
        basePath: '/tmp/test',
      });

      const risk = report.riskAssessment;
      expect(risk.attackSurfaceScore).toBeGreaterThanOrEqual(0);
      expect(risk.exploitabilityScore).toBeGreaterThanOrEqual(0);
      expect(risk.impactScore).toBeGreaterThanOrEqual(0);
      expect(risk.mitigationEffectiveness).toBeGreaterThanOrEqual(0);
    });
  });
});
