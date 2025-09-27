import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DEFAULT_REDACTION_POLICY,
  MsqeInspector,
  createMsqe,
  verifySignature,
} from '../src/index.js';

const FIXED_DATE = new Date('2024-01-01T00:00:00Z');

describe('msqe middleware', () => {
  it('captures stage traces and signs bundle', () => {
    const tracer = createMsqe({
      requestId: 'req-123',
      signingSecret: 'top-secret',
      clock: () => FIXED_DATE,
    });

    tracer.recordRetrieval({
      stage: 'primary',
      query: 'locate security playbooks',
      candidates: [
        {
          id: 'cand-1',
          score: 0.92,
          reason: 'semantic match',
          content: 'playbook content',
          metadata: { owner: 'alice', pii: true },
        },
        { id: 'cand-2', score: 0.31 },
      ],
      filters: [
        {
          name: 'policy-filter',
          before: 2,
          after: 1,
          dropped: ['cand-2'],
          rationale: 'insufficient policy tags',
        },
      ],
    });

    tracer.recordToolCall({
      callId: 'tool-1',
      tool: 'vector-search',
      args: { query: 'locate security playbooks' },
      result: { hits: 1 },
      latencyMs: 45,
    });

    tracer.recordGuardDecision({
      guard: 'moderation',
      decision: 'allow',
      appliesTo: 'tool-1',
      rationale: 'no policy violations detected',
    });

    tracer.recordOutputCheck({
      contract: 'json:v1',
      valid: true,
      output: { summary: 'all clear' },
    });

    const bundle = tracer.finalize();

    expect(bundle.summary.retrievals).toBe(1);
    expect(bundle.summary.totalCandidates).toBe(2);
    expect(bundle.summary.filtersApplied).toBe(1);
    expect(bundle.summary.toolCalls).toBe(1);
    expect(bundle.summary.guardDecisions.allow).toBe(1);
    expect(bundle.summary.outputValid).toBe(true);
    expect(bundle.events.map((event) => event.kind)).toEqual([
      'retrieval',
      'tool-call',
      'guard',
      'output-check',
    ]);
    expect(bundle.hash).toHaveLength(64);
    expect(bundle.signature).toHaveLength(64);
    expect(verifySignature(bundle, 'top-secret', bundle.signature)).toBe(true);
  });

  it('redacts sensitive previews while preserving decision flow', () => {
    const tracer = createMsqe({
      requestId: 'req-redact',
      signingSecret: 'top-secret',
      clock: () => FIXED_DATE,
    });

    tracer.recordRetrieval({
      stage: 'primary',
      query: 'contains pii',
      candidates: [
        {
          id: 'cand-1',
          score: 0.66,
          content: 'sensitive block',
          metadata: { pii: true, secret: 'token' },
        },
      ],
    });

    const bundle = tracer.finalizeForSharing();
    const retrieval = bundle.events[0];

    expect(retrieval.kind).toBe('retrieval');
    if (retrieval.kind === 'retrieval') {
      expect(retrieval.queryPreview).toBe(DEFAULT_REDACTION_POLICY.maskValue);
      expect(retrieval.candidates[0].metadataKeys).toEqual(['pii', 'secret']);
    }
    expect(bundle.summary.retrievals).toBe(1);
  });

  it('renders deterministic inspector markup', () => {
    const tracer = createMsqe({
      requestId: 'req-ui',
      signingSecret: 'top-secret',
      clock: () => FIXED_DATE,
    });

    tracer.recordRetrieval({
      stage: 'primary',
      query: 'alpha',
      candidates: [{ id: 'cand-1', score: 0.5 }],
    });

    const bundle = tracer.finalize();
    const first = renderToStaticMarkup(createElement(MsqeInspector, { bundle }));
    const second = renderToStaticMarkup(createElement(MsqeInspector, { bundle }));
    expect(second).toBe(first);
  });
});
