import { BaseModule } from './moduleBase';
import { defaultModules } from './modules';
import {
  ModuleExecutionResult,
  ModuleSnapshot,
  ModuleStatus,
  OrchestratorSnapshot,
  OrchestratorTask,
  TaskValidationIssue,
  TaskRecord,
} from './types';

interface EventPayloads {
  'module:status': { moduleId: string; status: ModuleStatus };
  'task:started': TaskRecord;
  'task:completed': TaskRecord;
  'task:error': TaskRecord;
}

type EventName = keyof EventPayloads;

type Listener<K extends EventName> = (payload: EventPayloads[K]) => void;

export class LaunchableOrchestrator {
  private modules: Map<string, BaseModule> = new Map();
  private tasks: TaskRecord[] = [];
  private listeners: Map<EventName, Set<Listener<EventName>>> = new Map();

  constructor(modules: BaseModule[] = defaultModules) {
    modules.forEach((module) => this.addModule(module));
  }

  addModule(module: BaseModule): void {
    this.modules.set(module.definition.id, module);
    this.emit('module:status', {
      moduleId: module.definition.id,
      status: this.decorateStatus(module.getStatus()),
    });
  }

  hasModule(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  getModule(moduleId: string): BaseModule | undefined {
    return this.modules.get(moduleId);
  }

  listModules(): ModuleSnapshot[] {
    return Array.from(this.modules.values()).map((module) => ({
      definition: module.definition,
      status: this.decorateStatus(module.getStatus()),
    }));
  }

  async startAll(): Promise<ModuleSnapshot[]> {
    const statuses: ModuleSnapshot[] = [];
    for (const module of this.modules.values()) {
      const status = this.decorateStatus(await module.start());
      statuses.push({ definition: module.definition, status });
      this.emit('module:status', {
        moduleId: module.definition.id,
        status,
      });
    }
    return statuses;
  }

  async stopAll(): Promise<void> {
    for (const module of this.modules.values()) {
      const status = this.decorateStatus(await module.stop());
      this.emit('module:status', {
        moduleId: module.definition.id,
        status,
      });
    }
  }

  async dispatchTask(task: OrchestratorTask): Promise<TaskRecord> {
    const record: TaskRecord = {
      task,
      startedAt: new Date().toISOString(),
      status: 'running',
      results: [],
    };
    this.tasks = [record, ...this.tasks];
    this.emit('task:started', record);

    const validationIssues = this.validateTask(task);
    if (validationIssues.length > 0) {
      record.status = 'error';
      record.completedAt = new Date().toISOString();
      record.results = validationIssues.map((issue) =>
        this.buildErrorResult(issue.moduleId, issue.action, issue.message),
      );
      this.emit('task:error', record);
      return record;
    }

    for (const action of task.actions) {
      const module = this.modules.get(action.moduleId);
      if (!module) {
        const errorMessage = `Module ${action.moduleId} not registered`;
        const errorResult = this.buildErrorResult(
          action.moduleId,
          action.action,
          errorMessage,
        );
        record.status = 'error';
        record.completedAt = new Date().toISOString();
        record.results.push(errorResult);
        this.emit('task:error', record);
        return record;
      }

      module.queueTask();
      this.emit('module:status', {
        moduleId: module.definition.id,
        status: this.decorateStatus(module.getStatus()),
      });

      try {
        const result = await module.executeTask(task, action);
        record.results.push(result);
        this.emit('module:status', {
          moduleId: module.definition.id,
          status: this.decorateStatus(module.getStatus()),
        });
      } catch (error) {
        const failure: ModuleExecutionResult = this.buildErrorResult(
          module.definition.id,
          action.action,
          error instanceof Error ? error.message : 'Unknown error',
        );
        record.results.push(failure);
        record.status = 'error';
        record.completedAt = new Date().toISOString();
        this.emit('module:status', {
          moduleId: module.definition.id,
          status: this.decorateStatus(module.getStatus()),
        });
        this.emit('task:error', record);
        return record;
      }
    }

    record.status = 'completed';
    record.completedAt = new Date().toISOString();
    this.emit('task:completed', record);
    return record;
  }

  getSnapshot(): OrchestratorSnapshot {
    return {
      modules: this.listModules(),
      tasks: this.tasks.map((task) => ({ ...task, results: [...task.results] })),
    };
  }

  on<K extends EventName>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const listeners = this.listeners.get(event)!;
    listeners.add(listener as Listener<EventName>);
    return () => {
      listeners.delete(listener as Listener<EventName>);
    };
  }

  private emit<K extends EventName>(event: K, payload: EventPayloads[K]): void {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }
    listeners.forEach((listener) => listener(payload as EventPayloads[EventName]));
  }

  validateTask(task: OrchestratorTask): TaskValidationIssue[] {
    const issues: TaskValidationIssue[] = [];
    for (const action of task.actions) {
      const module = this.modules.get(action.moduleId);
      if (!module) {
        issues.push({
          moduleId: action.moduleId,
          action: action.action,
          message: `Module "${action.moduleId}" is not registered with the orchestrator`,
        });
        continue;
      }

      if (!module.supportsAction(action.action)) {
        issues.push({
          moduleId: module.definition.id,
          action: action.action,
          message: `${module.definition.displayName} does not support action "${action.action}"`,
        });
      }
    }
    return issues;
  }

  private decorateStatus(status: ModuleStatus): ModuleStatus {
    if (status.startedAt) {
      const uptimeMs = Date.now() - new Date(status.startedAt).getTime();
      return { ...status, uptimeMs };
    }
    return status;
  }

  private buildErrorResult(
    moduleId: string,
    action: string,
    message: string,
  ): ModuleExecutionResult {
    return {
      moduleId,
      action,
      status: 'error',
      message,
      output: { message },
      durationMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export function createLaunchableOrchestrator(
  modules: BaseModule[] = defaultModules,
): LaunchableOrchestrator {
  return new LaunchableOrchestrator(modules);
}
