import { describe, expect, it } from 'vitest';
import { CounterfactualContextReassembler } from './counterfactualContextReassembly';
import { TrustWeightedContextAssembler } from '../trust/trustWeightedAssembly';
import { ContextSegment } from '../types';
import { DivergenceAnalyzer } from '../analysis/divergenceAnalysis';

const segments: ContextSegment[] = [
  {
    metadata: { id: 's1', source: 'user', createdAt: new Date(), labels: [] },
    content: 'alpha',
    trustWeight: { value: 1 },
    invariants: [],
  },
  {
    metadata: { id: 's2', source: 'tool', createdAt: new Date(), labels: [] },
    content: 'beta',
    trustWeight: { value: 0.5 },
    invariants: [],
  },
];

describe('CounterfactualContextReassembler', () => {
  it('builds variants for removal and attenuation', () => {
    const assembler = new TrustWeightedContextAssembler();
    const ccr = new CounterfactualContextReassembler(assembler, { maxVariants: 10 });
    const variants = ccr.generateVariants('base', segments);
    expect(variants).toHaveLength(segments.length * 2);
    const removalIds = variants.filter((variant) =>
      variant.modification.startsWith('removal')
    );
    expect(removalIds).toHaveLength(2);
  });
});

describe('DivergenceAnalyzer', () => {
  it('flags divergent variants', () => {
    const analyzer = new DivergenceAnalyzer(0.1);
    const baseResponse = { requestId: 'r1', modelId: 'm', output: 'consistent' };
    const variants = {
      v1: { requestId: 'r1', modelId: 'm', output: 'consistent' },
      v2: { requestId: 'r1', modelId: 'm', output: 'drift' },
    };
    const variantMeta = [
      {
        id: 'v1',
        modification: 'removal:s1',
        context: { id: 'c1', segments: [], encoded: {} },
      },
      {
        id: 'v2',
        modification: 'attenuate:s2',
        context: { id: 'c2', segments: [], encoded: {} },
      },
    ];

    const scores = analyzer.scoreResponses(baseResponse, variants, variantMeta);
    const indicators = analyzer.detectPoisoning(scores);
    expect(scores).toHaveLength(2);
    expect(indicators.some((indicator) => indicator.segmentId === 's2')).toBeTruthy();
  });
});
