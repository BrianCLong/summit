import { FederatedHit } from "../../adapters/types";
import { ScoreNormalizer } from "./scoreNormalizer";
import { ResultDeduper } from "./resultDeduper";

export interface FusionOptions {
  weights?: {
    vector?: number;
    keyword?: number;
    graph?: number;
  };
}

export class RankFusion {
  constructor(
    private normalizer: ScoreNormalizer,
    private deduper: ResultDeduper
  ) {}

  fuse(
    hitsBySource: Record<string, FederatedHit[]>,
    options?: FusionOptions
  ): FederatedHit[] {
    const weights = {
      vector: options?.weights?.vector ?? 1.0,
      keyword: options?.weights?.keyword ?? 1.0,
      graph: options?.weights?.graph ?? 1.0,
    };

    let allHits: FederatedHit[] = [];

    for (const sourceId in hitsBySource) {
      const normalizedHits = this.normalizer.normalize(hitsBySource[sourceId]);

      // Apply weights
      const weightedHits = normalizedHits.map(hit => ({
        ...hit,
        score: hit.score * weights[hit.modality],
      }));

      allHits.push(...weightedHits);
    }

    const dedupedHits = this.deduper.dedupe(allHits);

    dedupedHits.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.docId.localeCompare(b.docId);
    });

    return dedupedHits;
  }
}
