export interface BenchmarkRun {
  runId: string;
  benchmarkVersion: string;
  taskId: string;
  agentId: string;
  environmentRef: string;
  status: "pending" | "running" | "completed" | "failed" | "timeout";
  startTime: string;
  endTime?: string;
  error?: string;
}
