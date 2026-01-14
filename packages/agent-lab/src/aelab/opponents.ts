import { CandidateArtifact, ChampionRecord } from './types';

export const selectOpponents = <TCandidate>(
  champions: ChampionRecord<TCandidate>[],
  baselines: CandidateArtifact<TCandidate>[],
  lastK: number,
  includeBaselines: boolean,
): CandidateArtifact<TCandidate>[] => {
  const recent = champions.slice(Math.max(0, champions.length - lastK));
  const opponents = recent.map((record) => record.candidate);
  if (includeBaselines) {
    return [...opponents, ...baselines];
  }
  return opponents;
};
