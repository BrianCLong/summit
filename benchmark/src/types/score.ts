export interface BenchmarkScore {
  runId: string;
  benchmarkVersion: string;
  taskId: string;
  agentId: string;
  success: boolean;
  metrics: {
    outcome: number;
    efficiency: number;
    robustness?: number;
    governance: number;
    collaboration?: number;
    innovationDelta?: number;
  };
  weightedScore: number;
  evaluatorVersion: string;
  notes?: string[];
}
