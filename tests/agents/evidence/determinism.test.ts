import {
  assertDeterminism,
  assertDeterministicEvidenceDocument,
} from '../../../src/agents/evidence';

describe('evidence determinism', () => {
  it('allows deterministic report payloads', () => {
    expect(() =>
      assertDeterminism({
        runId: 'run-123',
        summary: 'ok',
        evidenceIds: ['EVD-PLTRHIVE-EVIDENCE-001'],
      }),
    ).not.toThrow();
  });

  it('rejects timestamp fields outside stamp payloads', () => {
    expect(() =>
      assertDeterminism({
        runId: 'run-123',
        summary: 'ok',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ).toThrow(/Determinism violation/);
  });

  it('rejects epoch-like numbers when keyed as timestamps', () => {
    expect(() =>
      assertDeterminism({
        runId: 'run-123',
        eventTime: 1735689600000,
      }),
    ).toThrow(/Determinism violation/);
  });


  it('allows ISO-like strings for non-timestamp fields', () => {
    expect(() =>
      assertDeterminism({
        runId: 'run-123',
        summary: 'window 2026-01-01T00:00:00Z approved',
      }),
    ).not.toThrow();
  });

  it('uses document kind helper to allow stamp timestamps only', () => {
    expect(() =>
      assertDeterministicEvidenceDocument('stamp', {
        runId: 'run-123',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ).not.toThrow();

    expect(() =>
      assertDeterministicEvidenceDocument('report', {
        runId: 'run-123',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ).toThrow(/Determinism violation/);
  });
  it('permits timestamps in stamp payloads when explicitly allowed', () => {
    expect(() =>
      assertDeterminism(
        { runId: 'run-123', createdAt: '2026-01-01T00:00:00Z' },
        { allowTimestampFields: true },
      ),
    ).not.toThrow();
  });
});
