import { Run, Task, Artifact, CostSample, RunCostSummary } from '../maestro/types';

export interface IntelGraphClient {
  createRun(run: Run): Promise<void>;
  updateRun(runId: string, patch: Partial<Run>): Promise<void>;

  createTask(task: Task): Promise<void>;
  updateTask(taskId: string, patch: Partial<Task>): Promise<void>;

  createArtifact(artifact: Artifact): Promise<void>;

  recordCostSample(sample: CostSample): Promise<void>;
  getRunCostSummary(runId: string): Promise<RunCostSummary>;
}

// a very thin, testable class
export class IntelGraphClientImpl implements IntelGraphClient {
  // ctor injects db driver / graph client
  private runs: Map<string, Run> = new Map();
  private tasks: Map<string, Task> = new Map();
  private artifacts: Map<string, Artifact> = new Map();
  private costs: Map<string, CostSample> = new Map();

  async createRun(run: Run): Promise<void> {
    this.runs.set(run.id, run);
  }
  async updateRun(runId: string, patch: Partial<Run>): Promise<void> {
    const existing = this.runs.get(runId);
    if (existing) {
      this.runs.set(runId, { ...existing, ...patch });
    }
  }

  async createTask(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
  }
  async updateTask(taskId: string, patch: Partial<Task>): Promise<void> {
    const existing = this.tasks.get(taskId);
    if (existing) {
      this.tasks.set(taskId, { ...existing, ...patch });
    }
  }

  async createArtifact(artifact: Artifact): Promise<void> {
    this.artifacts.set(artifact.id, artifact);
  }

  async recordCostSample(sample: CostSample): Promise<void> {
    this.costs.set(sample.id, sample);
  }
  async getRunCostSummary(runId: string): Promise<RunCostSummary> {
    const summary: RunCostSummary = {
      runId,
      totalCostUSD: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      byModel: {}
    };

    for (const cost of this.costs.values()) {
      if (cost.runId === runId) {
        summary.totalCostUSD += cost.cost;
        summary.totalInputTokens += cost.inputTokens;
        summary.totalOutputTokens += cost.outputTokens;

        const key = cost.model;
        if (!summary.byModel[key]) {
          summary.byModel[key] = { costUSD: 0, inputTokens: 0, outputTokens: 0 };
        }
        summary.byModel[key].costUSD += cost.cost;
        summary.byModel[key].inputTokens += cost.inputTokens;
        summary.byModel[key].outputTokens += cost.outputTokens;
      }
    }
    return summary;
  }
}
