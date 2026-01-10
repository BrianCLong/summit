import { MetricsRegistry } from '@intelgraph/platform-telemetry';
import { evaluateRlvrAdapterPolicy, parseRlvrAdapterConfig } from './rlvrAdapterPolicy.js';

describe('RLVR Adapter Policy', () => {
  const createMetrics = () => new MetricsRegistry({ collectDefaultMetrics: false });

  it('returns default structural adapter when RLVR is enabled', () => {
    const config = parseRlvrAdapterConfig({ RLVR_ENABLED: 'true' });
    const decision = evaluateRlvrAdapterPolicy(config, { metricsRegistry: createMetrics() });

    expect(decision.effectiveAdapter).toBe('dora');
    expect(decision.allowed).toBe(true);
    expect(decision.decision).toBe('ok');
  });

  it('blocks SVD-initialized adapters unless override is set', () => {
    const decision = evaluateRlvrAdapterPolicy(
      { rlvrEnabled: true, adapter: 'pissa' },
      { metricsRegistry: createMetrics() }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.issues.some((issue) => issue.rule === 'svd_blocked')).toBe(true);
  });

  it('allows override for blocked adapters when allowUnsafe is true', () => {
    const decision = evaluateRlvrAdapterPolicy(
      { rlvrEnabled: true, adapter: 'milora', allowUnsafe: true },
      { metricsRegistry: createMetrics() }
    );

    expect(decision.allowed).toBe(true);
    expect(decision.overrideUsed).toBe(true);
    expect(decision.decision).toBe('warn');
  });

  it('enforces minimum rank when RLVR is enabled', () => {
    const decision = evaluateRlvrAdapterPolicy(
      { rlvrEnabled: true, adapter: 'dora', rank: 4 },
      { metricsRegistry: createMetrics() }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.issues.some((issue) => issue.rule === 'rank_too_low')).toBe(true);
  });

  it('downgrades guardrail errors to warnings when warnOnly is enabled', () => {
    const decision = evaluateRlvrAdapterPolicy(
      { rlvrEnabled: true, adapter: 'dora', rank: 4, warnOnly: true },
      { metricsRegistry: createMetrics() }
    );

    expect(decision.allowed).toBe(true);
    expect(decision.decision).toBe('warn');
    expect(decision.overrideUsed).toBe(true);
  });

  it('warns for low-capacity adapters and requires override', () => {
    const decision = evaluateRlvrAdapterPolicy(
      { rlvrEnabled: true, adapter: 'vera', allowUnsafe: true },
      { metricsRegistry: createMetrics() }
    );

    expect(decision.allowed).toBe(true);
    expect(decision.decision).toBe('warn');
    expect(decision.overrideUsed).toBe(true);
    expect(decision.issues.some((issue) => issue.rule === 'low_capacity_adapter')).toBe(true);
  });

  it('normalizes adapter identifiers before evaluation', () => {
    const decision = evaluateRlvrAdapterPolicy(
      { rlvrEnabled: true, adapter: 'PiSSA', allowUnsafe: true },
      { metricsRegistry: createMetrics() }
    );

    expect(decision.overrideUsed).toBe(true);
    expect(decision.effectiveAdapter).toBe('pissa');
  });

  it('keeps guardrails inactive when RLVR is disabled', () => {
    const decision = evaluateRlvrAdapterPolicy(
      { rlvrEnabled: false, adapter: 'pissa' },
      { metricsRegistry: createMetrics() }
    );

    expect(decision.allowed).toBe(true);
    expect(decision.decision).toBe('ok');
    expect(decision.messages.some((message) => message.includes('inactive'))).toBe(true);
  });
});
