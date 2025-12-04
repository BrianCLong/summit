import {
  Run,
  Task,
  Artifact,
  CostSample,
  RunCostSummary,
} from '../maestro/types.js';

export interface IntelGraphClient {
  // writes
  createRun(run: Run): Promise<void>;
  updateRun(runId: string, patch: Partial<Run>): Promise<void>;

  createTask(task: Task): Promise<void>;
  updateTask(taskId: string, patch: Partial<Task>): Promise<void>;

  createArtifact(artifact: Artifact): Promise<void>;

  recordCostSample(sample: CostSample): Promise<void>;
  getRunCostSummary(runId: string): Promise<RunCostSummary>;

  // reads
  getRun(runId: string): Promise<Run | null>;
  getTasksForRun(runId: string): Promise<Task[]>;
  getTask(taskId: string): Promise<Task | null>;
  getArtifactsForRun(runId: string): Promise<Artifact[]>;
  getArtifactsForTask(taskId: string): Promise<Artifact[]>;
}
