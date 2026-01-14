import { selectOpponents } from '../src/aelab/opponents';
import { CandidateArtifact, ChampionRecord } from '../src/aelab/types';

const candidate = (id: string): CandidateArtifact<{ id: string }> => ({
  id,
  content: { id },
  contentHash: id,
  createdAt: new Date(0).toISOString(),
  parents: [],
  metadata: {},
});

const champion = (id: string): ChampionRecord<{ id: string }> => ({
  round: 0,
  candidate: candidate(id),
  metrics: { wins: 1, losses: 0, draws: 0, score: 1 },
  descriptor: { axes: [1, 1] },
});

describe('selectOpponents', () => {
  it('returns last K champions and baselines', () => {
    const champions = [champion('c1'), champion('c2'), champion('c3')];
    const baselines = [candidate('b1')];
    const opponents = selectOpponents(champions, baselines, 2, true);
    expect(opponents.map((c) => c.id)).toEqual(['c2', 'c3', 'b1']);
  });

  it('returns only champions when baselines disabled', () => {
    const champions = [champion('c1'), champion('c2')];
    const opponents = selectOpponents(champions, [], 5, false);
    expect(opponents.map((c) => c.id)).toEqual(['c1', 'c2']);
  });
});
