import { describe, expect, test } from 'vitest';
import { TrustWeightedContextAssembler } from './trustWeightedAssembly';
import { ContextSegment, Invariant } from '../types';

const buildInvariant = (id: string, ok: boolean): Invariant => ({
  id,
  description: `invariant-${id}`,
  validate: () => ok,
});

const buildSegment = (id: string, weight: number, invariants: Invariant[]): ContextSegment => ({
  metadata: { id, source: 'unit', createdAt: new Date(0), labels: [] },
  content: `segment-${id}`,
  trustWeight: { value: weight },
  invariants,
});

describe('TrustWeightedContextAssembler', () => {
  test('filters by trust and invariant enforcement', () => {
    const assembler = new TrustWeightedContextAssembler(10);
    const segments = [
      buildSegment('a', 0.9, [buildInvariant('ok', true)]),
      buildSegment('b', 0.1, [buildInvariant('bad', false)]),
    ];

    const report = assembler.assembleWithReport(segments, {
      minTrustWeight: 0.2,
      enforceInvariants: true,
    });

    expect(report.context.segments.map((segment) => segment.metadata.id)).toEqual(['a']);
    expect(report.violations.length).toBe(1);
    expect(report.droppedSegmentIds).toContain('b');
  });
});
