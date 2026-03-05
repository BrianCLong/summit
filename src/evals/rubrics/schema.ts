export interface AtomicRubric {
  id: string;
  criterion: string;
  weight: number;
}

export interface RubricEvalResult {
  score: number;
  reason: string;
  matchedRubrics: string[];
}
