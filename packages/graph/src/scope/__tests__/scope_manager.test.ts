import { jest } from '@jest/globals';

// Mock writeScopedEvidence from @summit/evidence
// Must be called before importing module under test
jest.unstable_mockModule('@summit/evidence', () => {
  return {
    writeScopedEvidence: jest.fn(async (evidence: any) => '/tmp/mock-evidence-path'),
    ScopedEvidence: {},
    EvidenceArtifact: { REPORT: 'report', METRICS: 'metrics', STAMP: 'stamp' }
  };
});

// Dynamic imports are required when using unstable_mockModule with ESM
const { ScopeManager } = await import('../ScopeManager.js');
const { writeScopedEvidence } = await import('@summit/evidence');

describe('ScopeManager', () => {
  let scopeManager: any; // Type as any for now since it's dynamically imported

  beforeEach(() => {
    scopeManager = new ScopeManager();
    jest.clearAllMocks();
  });

  it('should create a scope with correct properties', () => {
    const scope = scopeManager.createScope('test-domain', 'agent-1', 'policy-1', 'snap-1');
    expect(scope).toBeDefined();
    expect(scope.scopeId).toBeDefined();
    expect(scope.domain).toBe('test-domain');
    expect(scope.agentId).toBe('agent-1');
    expect(scope.status).toBe('active');
  });

  it('should close a scope and generate evidence', async () => {
    const scope = scopeManager.createScope('test-domain', 'agent-1', 'policy-1', 'snap-1');
    const evidencePath = await scopeManager.closeScope(scope.scopeId, { result: 'success' }, { duration: 100 });

    expect(scope.status).toBe('closed');
    const mockWrite = writeScopedEvidence as any;
    expect(mockWrite).toHaveBeenCalledWith(expect.objectContaining({
      scopeId: scope.scopeId,
      domain: 'test-domain',
      report: expect.objectContaining({ result: 'success' }),
      metrics: expect.objectContaining({ duration: 100 })
    }));
    expect(evidencePath).toBe('/tmp/mock-evidence-path');
  });

  it('should handle withScope correctly', async () => {
    const result = await scopeManager.withScope(
      'test-domain', 'agent-1', 'policy-1', 'snap-1',
      async (scope: any) => {
        expect(scope.status).toBe('active');
        scope.report['step1'] = 'done';
        return 'final-result';
      }
    );

    expect(result).toBe('final-result');
    const mockWrite = writeScopedEvidence as any;
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith(expect.objectContaining({
        report: expect.objectContaining({ step1: 'done' })
    }));
  });
});
