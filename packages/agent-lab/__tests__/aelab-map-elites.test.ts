import { MapElitesArchive } from '../src/aelab/mapElites';
import { CandidateArtifact } from '../src/aelab/types';

const candidate = (id: string): CandidateArtifact<{ id: string }> => ({
  id,
  content: { id },
  contentHash: id,
  createdAt: new Date(0).toISOString(),
  parents: [],
  metadata: {},
});

describe('MapElitesArchive', () => {
  it('indexes descriptors into bins and replaces by score', () => {
    const archive = new MapElitesArchive<{ id: string }>([2, 2], [
      [0, 10],
      [0, 10],
    ]);
    const descriptor = { axes: [6, 8] };
    const updated1 = archive.update(candidate('a'), { wins: 1, losses: 0, draws: 0, score: 0.4 }, descriptor);
    expect(updated1).toBe(true);
    const updated2 = archive.update(candidate('b'), { wins: 1, losses: 0, draws: 0, score: 0.2 }, descriptor);
    expect(updated2).toBe(false);
    const updated3 = archive.update(candidate('c'), { wins: 1, losses: 0, draws: 0, score: 0.9 }, descriptor);
    expect(updated3).toBe(true);
    const best = archive.bestOverall();
    expect(best?.candidate.id).toBe('c');
  });
});
