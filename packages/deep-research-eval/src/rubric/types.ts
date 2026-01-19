import type { TaskDefinition } from '../taskpack/schema.js';

export type RubricDimensionKind = 'general' | 'task-specific' | 'governance';

export interface RubricDimension {
  id: string;
  label: string;
  description: string;
  weight: number;
  criteria: string[];
  kind: RubricDimensionKind;
}

export interface AdaptiveRubric {
  taskId: string;
  generatedAt: string;
  seed: string;
  dimensions: RubricDimension[];
  sourceTask: TaskDefinition;
}

export interface DimensionScore {
  dimensionId: string;
  score: number;
  rationale: string;
}

export interface ScoringResult {
  taskId: string;
  totalScore: number;
  maxScore: number;
  dimensionScores: DimensionScore[];
}
