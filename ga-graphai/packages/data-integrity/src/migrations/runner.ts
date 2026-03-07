export type StepStatus = "pending" | "in-progress" | "completed";

export interface MigrationStep {
  id: string;
  description: string;
  dependsOn?: string[];
  idempotencyKey?: string;
  preflight?: () => Promise<PreflightResult>;
  dryRun?: () => Promise<string[]>;
  apply: (context: MigrationContext) => Promise<void>;
}

export interface PreflightResult {
  ok: boolean;
  dependencies?: string[];
  reasons?: string[];
}

export interface MigrationContext {
  recordRollbackMarker(stepId: string, marker: Record<string, unknown>): Promise<void>;
  statusOf(stepId: string): Promise<StepStatus>;
}

export interface CheckpointStore {
  status(stepId: string): Promise<StepStatus>;
  markInProgress(stepId: string): Promise<void>;
  markComplete(stepId: string): Promise<void>;
  recordRollbackMarker(stepId: string, marker: Record<string, unknown>): Promise<void>;
  listRollbackMarkers(): Promise<Record<string, Record<string, unknown>>>;
}

export class InMemoryCheckpointStore implements CheckpointStore {
  private state = new Map<string, StepStatus>();
  private markers = new Map<string, Record<string, unknown>>();

  async status(stepId: string): Promise<StepStatus> {
    return this.state.get(stepId) ?? "pending";
  }

  async markInProgress(stepId: string): Promise<void> {
    this.state.set(stepId, "in-progress");
  }

  async markComplete(stepId: string): Promise<void> {
    this.state.set(stepId, "completed");
  }

  async recordRollbackMarker(stepId: string, marker: Record<string, unknown>): Promise<void> {
    this.markers.set(stepId, marker);
  }

  async listRollbackMarkers(): Promise<Record<string, Record<string, unknown>>> {
    return Object.fromEntries(this.markers.entries());
  }
}

export class MigrationRunner {
  constructor(
    private readonly store: CheckpointStore,
    private readonly steps: MigrationStep[]
  ) {}

  async preflight(): Promise<void> {
    for (const step of this.steps) {
      const status = await this.store.status(step.id);
      if (status === "completed") continue;
      const depends = step.dependsOn ?? [];
      for (const dependency of depends) {
        const depStatus = await this.store.status(dependency);
        if (depStatus !== "completed") {
          throw new Error(`Preflight failed: dependency ${dependency} incomplete for ${step.id}`);
        }
      }
      if (step.preflight) {
        const result = await step.preflight();
        if (!result.ok) {
          const reasons = result.reasons?.join(", ") ?? "unknown reason";
          throw new Error(`Preflight failed for ${step.id}: ${reasons}`);
        }
      }
    }
  }

  async dryRun(): Promise<string[]> {
    await this.preflight();
    const planned: string[] = [];
    for (const step of this.steps) {
      const status = await this.store.status(step.id);
      if (status === "completed") continue;
      const preview = step.dryRun ? await step.dryRun() : [`apply ${step.id}`];
      planned.push(...preview);
    }
    return planned;
  }

  async apply(): Promise<void> {
    await this.preflight();
    for (const step of this.steps) {
      const status = await this.store.status(step.id);
      if (status === "completed") {
        continue;
      }
      await this.store.markInProgress(step.id);
      const context: MigrationContext = {
        recordRollbackMarker: (stepId, marker) => this.store.recordRollbackMarker(stepId, marker),
        statusOf: (stepId) => this.store.status(stepId),
      };
      await step.apply(context);
      await this.store.markComplete(step.id);
    }
  }
}
