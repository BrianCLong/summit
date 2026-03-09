export interface EvidenceScore {
  precision: number;
  recall: number;
  coverage: number;
  f1_score?: number;
}

export function calculateEvidenceScores(
  retrievedEvidence: string[],
  expectedEvidence: string[]
): EvidenceScore {
  const retrievedSet = new Set(retrievedEvidence);
  const expectedSet = new Set(expectedEvidence);

  let truePositives = 0;
  for (const item of retrievedSet) {
    if (expectedSet.has(item)) {
      truePositives++;
    }
  }

  const precision = retrievedSet.size === 0 ? 1.0 : truePositives / retrievedSet.size;
  const recall = expectedSet.size === 0 ? 1.0 : truePositives / expectedSet.size;
  const coverage = expectedSet.size === 0 ? 1.0 : truePositives / expectedSet.size;

  const f1_score = precision + recall === 0 ? 0 : (2 * (precision * recall)) / (precision + recall);

  return {
    precision,
    recall,
    coverage,
    f1_score,
  };
}

export function aggregateScores(scores: EvidenceScore[]): EvidenceScore {
  if (scores.length === 0) {
    return { precision: 0, recall: 0, coverage: 0, f1_score: 0 };
  }

  const sum = scores.reduce(
    (acc, score) => ({
      precision: acc.precision + score.precision,
      recall: acc.recall + score.recall,
      coverage: acc.coverage + score.coverage,
      f1_score: acc.f1_score + (score.f1_score || 0),
    }),
    { precision: 0, recall: 0, coverage: 0, f1_score: 0 }
  );

  return {
    precision: sum.precision / scores.length,
    recall: sum.recall / scores.length,
    coverage: sum.coverage / scores.length,
    f1_score: sum.f1_score / scores.length,
  };
}
