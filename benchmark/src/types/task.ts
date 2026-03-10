export type BenchmarkFamily =
  | "software-engineering"
  | "intelgraph"
  | "coordination"
  | "governance"
  | "long-horizon";

export interface BenchmarkTask {
  taskId: string;
  benchmarkVersion: string;
  family: BenchmarkFamily;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "frontier";
  environmentRef: string;
  graphSnapshotRef?: string;
  toolProfile: string;
  budgets: {
    maxSteps: number;
    maxRuntimeSec: number;
    maxCostUsd?: number;
    maxToolCalls?: number;
  };
  inputs: Record<string, unknown>;
  successCriteria: Record<string, unknown>;
  scoringProfile: string;
  requiredArtifacts?: Record<string, unknown>[];
  tags?: string[];
  seed?: number;
}
