export interface AtomicRubric {
  id: string;
  criterion: string;
  weight: number;
}

export interface RubricComposite {
  id: string;
  instruction: string;
  atomicCriteria: AtomicRubric[];
}

export interface EvalRun {
  evidenceId: string;
  model: string;
  instruction: string;
  output: string;
  rubricId: string;
  scores: { [criterionId: string]: number };
  totalScore: number;
  timestampHash: string;
}
