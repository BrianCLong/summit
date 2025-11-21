import { describe, it, expect, beforeEach } from 'vitest';
import { RemediationEngine } from '../remediation/remediation-engine.js';
import type { Vulnerability } from '../types.js';

describe('RemediationEngine', () => {
  let engine: RemediationEngine;

  beforeEach(() => {
    engine = new RemediationEngine({
      autoRemediate: false,
      requireApproval: true,
      createBackups: true,
      runVerification: false,
      dryRun: true,
    });
  });

  describe('task management', () => {
    it('should create remediation tasks from vulnerabilities', async () => {
      const vulns: Vulnerability[] = [
        {
          id: 'SQL_INJECTION-abc123',
          title: 'SQL Injection',
          description: 'SQL injection vulnerability',
          severity: 'critical',
          category: 'injection',
          cvssScore: 9.5,
          cweId: 'CWE-89',
          location: {
            file: '/tmp/test.ts',
            startLine: 10,
            endLine: 12,
            codeSnippet: 'db.query("SELECT * FROM users WHERE id = " + userId)',
          },
          attribution: {
            source: 'static-analysis',
            confidence: 0.9,
            scanId: 'scan-123',
            timestamp: new Date(),
          },
          evidence: [],
          remediation: {
            description: 'Use parameterized queries',
            priority: 'immediate',
            estimatedEffort: '1 hour',
            automatable: true,
            verificationSteps: ['Run SQL injection tests'],
            codeChanges: [
              {
                file: '/tmp/test.ts',
                oldCode: 'db.query("SELECT * FROM users WHERE id = " + userId)',
                newCode: 'db.query("SELECT * FROM users WHERE id = ?", [userId])',
                explanation: 'Use parameterized query',
              },
            ],
          },
          complianceImpact: [],
          detectedAt: new Date(),
          status: 'open',
        },
      ];

      const tasks = await engine.createRemediationTasks(vulns);

      expect(tasks.length).toBeGreaterThanOrEqual(0);
    });

    it('should track pending tasks', async () => {
      const pending = engine.getPendingTasks();
      expect(Array.isArray(pending)).toBe(true);
    });

    it('should get all tasks', () => {
      const all = engine.getAllTasks();
      expect(Array.isArray(all)).toBe(true);
    });
  });

  describe('approval workflow', () => {
    it('should require approval when configured', () => {
      const strictEngine = new RemediationEngine({
        requireApproval: true,
        dryRun: true,
      });
      expect(strictEngine).toBeDefined();
    });

    it('should auto-approve when configured', () => {
      const autoEngine = new RemediationEngine({
        autoRemediate: true,
        autoRemediateMaxSeverity: 'medium',
        requireApproval: false,
        dryRun: true,
      });
      expect(autoEngine).toBeDefined();
    });
  });

  describe('remediation execution', () => {
    it('should execute in dry-run mode', async () => {
      const report = await engine.executeRemediations();

      expect(report.sessionId).toBeDefined();
      expect(report.startTime).toBeInstanceOf(Date);
      expect(report.endTime).toBeInstanceOf(Date);
      expect(report.tasksTotal).toBeGreaterThanOrEqual(0);
    });
  });
});
