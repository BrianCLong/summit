import { FederatedHit } from "../../adapters/types";

export class ScoreNormalizer {
  normalize(hits: FederatedHit[]): FederatedHit[] {
    if (hits.length === 0) return [];

    let minScore = Infinity;
    let maxScore = -Infinity;

    for (const hit of hits) {
      if (hit.score < minScore) minScore = hit.score;
      if (hit.score > maxScore) maxScore = hit.score;
    }

    if (maxScore === minScore) {
      return hits.map(hit => ({ ...hit, score: 1.0 }));
    }

    return hits.map(hit => ({
      ...hit,
      score: (hit.score - minScore) / (maxScore - minScore),
    }));
  }
}
