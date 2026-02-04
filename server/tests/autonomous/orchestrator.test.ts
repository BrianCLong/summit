
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EnhancedAutonomousOrchestrator, RunConfig, Action } from '../../src/autonomous/orchestrator.enhanced';
import fs from 'fs';
import path from 'path';

// Mock dependencies
const mockDb = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
};
const mockRedis = {
  subscribe: jest.fn(),
  on: jest.fn(),
  publish: jest.fn(),
};
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  child: jest.fn().mockReturnThis(),
};
const mockPolicyEngine = {
  evaluate: jest.fn().mockResolvedValue({ allowed: true }),
};

// Mock OpenTelemetry
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startActiveSpan: (name: string, fn: any) => {
        const span = {
            setStatus: jest.fn(),
            setAttributes: jest.fn(),
            end: jest.fn()
        };
        return fn(span);
      },
    }),
  },
  context: { active: () => ({}) },
  SpanStatusCode: { OK: 1, ERROR: 2 },
}));

describe('EnhancedAutonomousOrchestrator Governance', () => {
  let orchestrator: any;
  const evidenceDir = path.join(process.cwd(), 'evidence', 'traces');

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new EnhancedAutonomousOrchestrator(
      mockDb as any,
      mockRedis as any,
      mockLogger as any,
      mockPolicyEngine as any
    );

    // Clear evidence dir
    if (fs.existsSync(evidenceDir)) {
      fs.rmSync(evidenceDir, { recursive: true, force: true });
    }
  });

  it('should generate an execution trace artifact upon task completion', async () => {
    // 1. Setup - Register a dummy action
    const dummyAction: Action = {
      name: 'analyze_goal', // Matches default generated task
      version: '1.0.0',
      safety: {
        category: 'read',
        budgets: { timeMs: 100, network: 'none' }
      },
      validate: async () => ({ success: true, data: {} }),
      plan: async () => ({ steps: [] }),
      apply: async () => ({ result: 'success' })
    };
    orchestrator.registerAction(dummyAction);

    // 2. Setup - Mock DB responses to simulate task lifecycle
    // getRun response
    mockDb.query.mockResolvedValueOnce({ rows: [{
        id: 'run-1',
        goal: 'test',
        autonomy: 1,
        created_by: 'user',
        tenant_id: 'tenant',
        mode: 'APPLY'
    }] });

    // 3. Invoke - Execute a task directly (to avoid complex async flow of createRun)
    const task = {
      id: 'task-1',
      runId: 'run-1',
      type: 'analyze_goal',
      params: {},
      dependencies: [],
      safetyCategory: 'read',
      requiresApproval: false,
      idempotencyKey: 'key'
    };

    // Mock idempotency check (empty result = not done)
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    await (orchestrator as any).executeTask(task, 'correlation-1');

    // 4. Verify - Check file system for trace
    const files = fs.readdirSync(evidenceDir);
    expect(files.length).toBe(1);

    const traceContent = JSON.parse(fs.readFileSync(path.join(evidenceDir, files[0]), 'utf-8'));
    expect(traceContent.taskId).toBe('task-1');
    expect(traceContent.result.output).toEqual({ result: 'success' });
    expect(traceContent.compliance_tags).toContain('traceability');
  });
});
