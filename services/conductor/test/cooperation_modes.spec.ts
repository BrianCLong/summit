import { runAuctionOfExperts } from '../src/fabric/modes/auctionOfExperts';
import { weaveSemanticBraid } from '../src/fabric/modes/semanticBraid';
import { buildCounterfactualShadow } from '../src/fabric/modes/counterfactualShadowing';
import { crossEntropySwap } from '../src/fabric/modes/crossEntropySwaps';
import { federatedConsensus } from '../src/fabric/modes/federatedDeliberation';
import { issueProofOfUsefulWorkbook } from '../src/fabric/modes/proofOfUsefulWorkbook';

describe('cooperation modes', () => {
  it('runs Auction-of-Experts and selects winners under constraints', () => {
    const result = runAuctionOfExperts(
      [
        {
          modelId: 'llm-a',
          est: { quality: 0.82, latencyMs: 500, costUSD: 0.08 },
          confidence: 0.8,
          fitTags: ['flakeRate', 'test'],
          rationale: 'High coverage for test repairs',
        },
        {
          modelId: 'llm-b',
          est: { quality: 0.7, latencyMs: 700, costUSD: 0.05 },
          confidence: 0.7,
          fitTags: ['coverage'],
          rationale: 'Coverage specialist',
        },
      ],
      {
        costBudgetUsd: 0.2,
        latencyBudgetMs: 900,
        requiredSkills: ['test', 'coverage'],
      },
    );
    expect(result.winners.length).toBeGreaterThan(0);
    expect(result.coverage).toBeGreaterThan(0);
  });

  it('weaves semantic braid and flags inconsistencies', () => {
    const braid = weaveSemanticBraid(
      [
        { kind: 'spec', content: 'Spec describes target MAESTRO-WORKER' },
        {
          kind: 'tests',
          content: 'Adds test MAESTRO-WORKER-FLAKE',
          references: ['MAESTRO-WORKER'],
        },
        {
          kind: 'impl',
          content: 'Implementation ensures MAESTRO-WORKER-FLAKE fixed',
        },
        {
          kind: 'release',
          content: 'Release ensures flakeRate and coverage are improved',
        },
      ],
      {
        acceptanceMetrics: ['flakeRate', 'coverage'],
        declaredTargets: ['MAESTRO-WORKER'],
      },
    );
    expect(
      braid.issues.find((msg) => msg.includes('undeclared')),
    ).toBeUndefined();
    expect(braid.consistencyProof.length).toBeGreaterThan(0);
  });

  it('builds counterfactual seeds to improve flake reproduction', () => {
    const shadow = buildCounterfactualShadow(
      [
        { test: 'spec1', failureRate: 0.4, env: { seed: 1, parallelism: 2 } },
        { test: 'spec2', failureRate: 0.1, env: { seed: 5 } },
      ],
      2,
    );
    expect(shadow.seeds.length).toBeGreaterThan(0);
    expect(shadow.expectedReproRate).toBeGreaterThan(0);
  });

  it('prefers proposal with lower cross entropy', () => {
    const result = crossEntropySwap(
      { id: 'a', text: 'fix', criticScores: [0.9, 0.8, 0.85] },
      { id: 'b', text: 'alt', criticScores: [0.1, 0.1, 0.1] },
    );
    expect(result.winner.id).toBe('a');
  });

  it('computes federated consensus using weighted quorums', () => {
    const consensus = federatedConsensus(
      [
        { region: 'us', proposalId: 'p1', score: 0.9, weight: 0.5 },
        { region: 'eu', proposalId: 'p1', score: 0.8, weight: 0.3 },
        { region: 'apac', proposalId: 'p2', score: 0.7, weight: 0.2 },
      ],
      0.6,
    );
    expect(consensus.winningProposalId).toBe('p1');
    expect(consensus.support).toBeGreaterThan(0.6);
  });

  it('issues proof-of-useful workbook receipts', () => {
    const bundle = issueProofOfUsefulWorkbook(
      'task:router-test',
      [
        {
          name: 'k6',
          command: 'npm run k6',
          expectedEvidence: 'k6-report.json',
        },
        { name: 'jest', command: 'npm test', expectedEvidence: 'junit.xml' },
      ],
      () => 'pass',
    );
    expect(bundle.receipts.length).toBe(2);
    expect(bundle.digest.startsWith('sha256:')).toBe(true);
  });
});
