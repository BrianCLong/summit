import { DeliberationEngine } from '../DeliberationEngine.js';
import { AnsweringPolicy } from '../../policies/answering.js';
import { ProofSubgraph } from '../../justification/ProofExtractor.js';
import { CandidateExplanation } from '../../types/explanations.js';

describe('Deliberation & Answering', () => {
  const mockExplanation = (id: string): CandidateExplanation => ({
    id,
    seedEntities: ['s1'],
    discoverySubgraphRef: 'ref',
    rationale: 'test'
  });

  const mockProof = (edgeCount: number, divCount: number): ProofSubgraph => ({
    nodes: Array.from({ length: divCount }, (_, i) => ({
      id: `n${i}`,
      labels: ['Entity'],
      properties: {},
      provenance: `EVID-${i}`
    })),
    edges: Array.from({ length: edgeCount }, (_, i) => ({
      type: 'LINK',
      sourceId: 's',
      targetId: 't',
      properties: {}
    }))
  });

  test('DeliberationEngine should select most robust explanation', () => {
    const c1 = { explanation: mockExplanation('c1'), proof: mockProof(5, 2) }; // robust
    const c2 = { explanation: mockExplanation('c2'), proof: mockProof(1, 1) }; // weak

    const result = DeliberationEngine.deliberate([c1, c2]);

    expect(result.selectedExplanation.id).toBe('c1');
    expect(result.rejectedExplanations.length).toBe(1);
    expect(result.rejectedExplanations[0].explanation.id).toBe('c2');
  });

  test('AnsweringPolicy should refuse if robustness is too low', () => {
    const policy = new AnsweringPolicy({ minRobustness: 10, minEvidenceDiversity: 2 });
    const weakResult = DeliberationEngine.deliberate([
      { explanation: mockExplanation('weak'), proof: mockProof(1, 1) }
    ]);

    const decision = policy.shouldRefuse(weakResult);
    expect(decision.refuse).toBe(true);
    expect(decision.reason).toContain('Insufficient robustness');
  });

  test('AnsweringPolicy should allow if criteria are met', () => {
    const policy = new AnsweringPolicy({ minRobustness: 0.5, minEvidenceDiversity: 1 });
    const strongResult = DeliberationEngine.deliberate([
      { explanation: mockExplanation('strong'), proof: mockProof(10, 5) }
    ]);

    const decision = policy.shouldRefuse(strongResult);
    expect(decision.refuse).toBe(false);
  });
});
