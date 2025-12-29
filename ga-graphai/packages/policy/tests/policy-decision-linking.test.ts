import { describe, expect, it, vi } from 'vitest';
import { MODEL_ALLOWLIST, PURPOSE_ALLOWLIST } from 'common-types';
import { PolicyEvaluator } from '../src/index.ts';
import type { PolicyConfig, CursorEvent } from 'common-types';

const baseConfig: PolicyConfig = {
  allowedLicenses: ['MIT', 'Apache-2.0'],
  allowedPurposes: [...PURPOSE_ALLOWLIST],
  modelAllowList: Array.from(MODEL_ALLOWLIST),
};

function buildEvent(): CursorEvent {
  return {
    tenantId: 'tenant-123',
    repo: 'demo/repo',
    branch: 'main',
    event: 'cursor.prompt',
    actor: { id: 'user-1' },
    ts: new Date().toISOString(),
    model: {
      name: baseConfig.modelAllowList[0] ?? 'default-model',
      vendor: 'test',
    },
    purpose: baseConfig.allowedPurposes[0],
    provenance: {
      sessionId: 'session-1',
      requestId: 'request-1',
    },
    inputRef: {
      promptSha256: 'prompt-sha',
      contextRefs: ['ctx-1'],
    },
    outputRef: {
      artifactSha256: 'artifact-1',
    },
  };
}

describe('PolicyDecision linking metadata', () => {
  it('adds decision_id, correlation_id, and evidence_refs to decisions', () => {
    const evaluator = new PolicyEvaluator({ config: baseConfig });
    const event = buildEvent();

    const decision = evaluator.evaluate(event, { story: { id: 'story-1' } });

    expect(decision.decision_id).toBeDefined();
    expect(decision.decision_id.length).toBeGreaterThan(0);
    expect(decision.correlation_id).toBe('request-1');
    expect(decision.evidence_refs).toEqual(
      expect.arrayContaining(['prompt-sha', 'ctx-1', 'artifact-1', 'story-1']),
    );
  });

  it('emits provenance events when enabled', () => {
    const provenanceWriter = vi.fn();
    const evaluator = new PolicyEvaluator({
      config: baseConfig,
      enableProvenanceEmission: true,
      provenanceWriter,
    });
    const event = buildEvent();

    const decision = evaluator.evaluate(event);

    expect(provenanceWriter).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PolicyDecisionRecorded',
        decision,
        decision_id: decision.decision_id,
        correlation_id: decision.correlation_id,
        evidence_refs: decision.evidence_refs,
        source: 'policy-evaluator',
      }),
    );
  });
});
