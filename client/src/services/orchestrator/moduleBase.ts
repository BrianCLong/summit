import {
  ModuleDefinition,
  ModuleExecutionResult,
  ModuleHandlerContext,
  ModuleHandlerResult,
  ModuleStatus,
  ModuleTelemetry,
  ModuleAction,
  OrchestratorTask,
} from './types';

export type ModuleHandler = (
  context: ModuleHandlerContext,
) => Promise<ModuleHandlerResult>;

interface ExecutionStats {
  successes: number;
  errors: number;
  totalLatency: number;
}

export class BaseModule {
  public readonly definition: ModuleDefinition;
  private status: ModuleStatus;
  private handlers: Record<string, ModuleHandler>;
  private stats: ExecutionStats = { successes: 0, errors: 0, totalLatency: 0 };

  constructor(
    definition: ModuleDefinition,
    handlers: Record<string, ModuleHandler>,
  ) {
    this.definition = definition;
    this.handlers = handlers;
    this.status = {
      state: 'offline',
      lastMessage: 'Module registered and awaiting start',
      updatedAt: new Date().toISOString(),
      uptimeMs: 0,
      tasksProcessed: 0,
      queueDepth: 0,
      successCount: 0,
      errorCount: 0,
      telemetry: {
        latencyMs: 0,
        throughputPerMinute: 0,
        utilization: 0,
        reliability: 1,
      },
    };
  }

  getStatus(): ModuleStatus {
    return JSON.parse(JSON.stringify(this.status));
  }

  listActions(): string[] {
    return Object.keys(this.handlers);
  }

  supportsAction(actionName: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.handlers, actionName);
  }

  async start(): Promise<ModuleStatus> {
    this.status = {
      ...this.status,
      state: 'starting',
      lastMessage: 'Bootstrapping module runtime',
      updatedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      uptimeMs: 0,
    };

    await this.simulateWork(25);

    this.status = {
      ...this.status,
      state: 'running',
      lastMessage: 'Module online and ready to receive tasks',
      updatedAt: new Date().toISOString(),
      uptimeMs: 0,
    };
    return this.getStatus();
  }

  async stop(): Promise<ModuleStatus> {
    this.status = {
      ...this.status,
      state: 'offline',
      lastMessage: 'Module stopped by orchestrator',
      updatedAt: new Date().toISOString(),
      uptimeMs: 0,
      startedAt: undefined,
    };
    return this.getStatus();
  }

  async executeTask(
    task: OrchestratorTask,
    action: ModuleAction,
  ): Promise<ModuleExecutionResult> {
    if (!this.supportsAction(action.action)) {
      throw new Error(
        `${this.definition.displayName} cannot perform action "${action.action}"`,
      );
    }

    const handler = this.handlers[action.action];

    const start = Date.now();
    this.status = {
      ...this.status,
      state: 'running',
      lastMessage: `Executing action ${action.action}`,
      updatedAt: new Date().toISOString(),
      tasksProcessed: this.status.tasksProcessed + 1,
      queueDepth: Math.max(this.status.queueDepth - 1, 0),
    };

    try {
      const result = await handler({
        action,
        task,
        status: this.getStatus(),
        definition: this.definition,
      });

      const duration = Date.now() - start;
      this.stats.successes += 1;
      this.stats.totalLatency += duration;

      this.status = {
        ...this.status,
        state: 'running',
        lastMessage: result.message,
        updatedAt: new Date().toISOString(),
        successCount: this.stats.successes,
        errorCount: this.stats.errors,
        telemetry: this.calculateTelemetry(duration, result.telemetry),
      };

      return {
        moduleId: this.definition.id,
        action: action.action,
        status: 'success',
        message: result.message,
        output: result.output ?? {},
        durationMs: duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - start;
      this.stats.errors += 1;

      this.status = {
        ...this.status,
        state: 'error',
        lastMessage:
          error instanceof Error ? error.message : 'Unknown module error',
        updatedAt: new Date().toISOString(),
        successCount: this.stats.successes,
        errorCount: this.stats.errors,
        telemetry: this.calculateTelemetry(duration),
      };

      throw error;
    }
  }

  queueTask(): void {
    this.status = {
      ...this.status,
      queueDepth: this.status.queueDepth + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  private calculateTelemetry(
    lastLatency: number,
    overrides?: Partial<ModuleTelemetry>,
  ): ModuleTelemetry {
    const processed = this.stats.successes + this.stats.errors;
    const avgLatency =
      processed > 0 ? Math.round(this.stats.totalLatency / processed) : 0;

    const telemetry: ModuleTelemetry = {
      latencyMs: overrides?.latencyMs ?? avgLatency ?? lastLatency,
      throughputPerMinute:
        overrides?.throughputPerMinute ?? Math.max(processed * 4, 1),
      utilization: overrides?.utilization ?? Math.min(processed / 20, 1),
      reliability:
        overrides?.reliability ??
        (processed > 0
          ? Number((this.stats.successes / processed).toFixed(2))
          : 1),
    };

    return telemetry;
  }

  private async simulateWork(durationMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
