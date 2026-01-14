import {
  MCPClient,
  TaskRef,
  TaskSearchFilters,
  TaskSpec,
  TaskPatch,
  TaskStore,
  TaskStoreConfig,
  TaskUpdatePreconditions,
} from './types.js';
import { PolicyGate, PolicyError } from './policy.js';
import { EvidenceRecorder } from './evidence.js';
import { resolveTools, ToolBinding } from './binding.js';
import {
  buildCreateArgs,
  buildSearchArgs,
  buildUpdateArgs,
  hashRequest,
  idempotencyMarker,
  normalizeTasks,
} from './utils.js';

export class Things3TaskStore implements TaskStore {
  private readonly client: MCPClient;
  private readonly tools: ToolBinding;
  private readonly policy: PolicyGate;
  private readonly evidence: EvidenceRecorder;
  private readonly agentId?: string;

  private constructor(client: MCPClient, tools: ToolBinding, config?: TaskStoreConfig) {
    this.client = client;
    this.tools = tools;
    this.policy = new PolicyGate(config?.policy);
    this.evidence = new EvidenceRecorder(config?.evidence);
    this.agentId = config?.agentId;
  }

  static async create(client: MCPClient, config?: TaskStoreConfig): Promise<Things3TaskStore> {
    const toolList = await client.listTools();
    const tools = resolveTools(toolList.tools ?? [], config?.toolOverrides);
    return new Things3TaskStore(client, tools, config);
  }

  async searchTasks(query: string, filters?: TaskSearchFilters): Promise<TaskRef[]> {
    const operation = 'search';
    this.policy.assertAllowed({ operation, filters });
    const tool = this.tools.search;
    const args = buildSearchArgs(tool, query, filters);
    const startedAt = new Date();
    const requestHash = hashRequest({ operation, tool: tool.name, args, agentId: this.agentId });
    try {
      const response = await this.client.callTool(tool.name, args);
      const tasks = normalizeTasks(response);
      await this.evidence.write({
        requestHash,
        operation,
        toolName: tool.name,
        args,
        responseSummary: this.evidence.summarize(response),
        policy: { allowed: true, dryRun: this.policy.isDryRun },
        timestamps: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
        },
      });
      return tasks;
    } catch (error) {
      await this.evidence.write({
        requestHash,
        operation,
        toolName: tool.name,
        args,
        policy: { allowed: false, dryRun: this.policy.isDryRun, reason: 'execution-error' },
        timestamps: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
        },
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async createTask(spec: TaskSpec, idempotencyKey: string): Promise<TaskRef> {
    if (!idempotencyKey) {
      throw new PolicyError('idempotencyKey is required for task creation.', 'IDEMPOTENCY_REQUIRED');
    }
    const operation = 'create';
    this.policy.assertAllowed({ operation, spec });
    const marker = idempotencyMarker(idempotencyKey);
    const existing = await this.searchTasks(marker, { limit: 5 });
    if (existing.length > 0) {
      return { ...existing[0], idempotencyKey };
    }
    const tool = this.tools.create;
    const notes = spec.notes ? `${spec.notes}\n\n${marker}` : marker;
    const specWithMarker: TaskSpec = { ...spec, notes };
    const args = buildCreateArgs(tool, specWithMarker);
    const startedAt = new Date();
    const requestHash = hashRequest({ operation, tool: tool.name, args, agentId: this.agentId });

    if (this.policy.isDryRun) {
      const dryRunRef: TaskRef = {
        id: `dry-run-${requestHash.slice(0, 8)}`,
        title: spec.title,
        notes,
        status: spec.status ?? 'open',
        tags: spec.tags,
        due: spec.due,
        scheduled: spec.scheduled,
        project: spec.project,
        area: spec.area,
        url: spec.url,
        idempotencyKey,
      };
      await this.evidence.write({
        requestHash,
        operation,
        toolName: tool.name,
        args,
        responseSummary: this.evidence.summarize(dryRunRef),
        policy: { allowed: true, dryRun: true },
        timestamps: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
        },
        idempotencyKey,
      });
      return dryRunRef;
    }

    try {
      const response = await this.client.callTool(tool.name, args);
      const tasks = normalizeTasks(response);
      const created = tasks[0] ?? {
        id: requestHash.slice(0, 12),
        title: spec.title,
        notes,
        idempotencyKey,
      };
      await this.evidence.write({
        requestHash,
        operation,
        toolName: tool.name,
        args,
        responseSummary: this.evidence.summarize(response),
        policy: { allowed: true, dryRun: false },
        timestamps: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
        },
        idempotencyKey,
      });
      return { ...created, idempotencyKey };
    } catch (error) {
      await this.evidence.write({
        requestHash,
        operation,
        toolName: tool.name,
        args,
        policy: { allowed: false, dryRun: false, reason: 'execution-error' },
        timestamps: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
        },
        idempotencyKey,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateTask(
    ref: TaskRef,
    patch: TaskPatch,
    preconditions?: TaskUpdatePreconditions,
  ): Promise<TaskRef> {
    const operation = 'update';
    this.policy.assertAllowed({ operation, patch, preconditions });
    const tool = this.tools.update;
    const current = await this.resolveCurrent(ref, preconditions);

    if (preconditions?.expectedStatus && current.status !== preconditions.expectedStatus) {
      throw new PolicyError(
        `Precondition failed: expected status ${preconditions.expectedStatus}.`,
        'PRECONDITION_FAILED',
      );
    }
    if (preconditions?.expectedNotesHash) {
      const currentHash = hashRequest(current.notes ?? '');
      if (currentHash !== preconditions.expectedNotesHash) {
        throw new PolicyError(
          'Precondition failed: notes hash mismatch.',
          'PRECONDITION_FAILED',
        );
      }
    }

    const args = { id: ref.id, ...buildUpdateArgs(tool, patch) };
    const startedAt = new Date();
    const requestHash = hashRequest({ operation, tool: tool.name, args, agentId: this.agentId });

    if (this.policy.isDryRun) {
      const dryRunRef = { ...current, ...patch };
      await this.evidence.write({
        requestHash,
        operation,
        toolName: tool.name,
        args,
        responseSummary: this.evidence.summarize(dryRunRef),
        policy: { allowed: true, dryRun: true },
        timestamps: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
        },
      });
      return dryRunRef;
    }

    try {
      const response = await this.client.callTool(tool.name, args);
      const tasks = normalizeTasks(response);
      const updated = tasks[0] ?? { ...current, ...patch };
      await this.evidence.write({
        requestHash,
        operation,
        toolName: tool.name,
        args,
        responseSummary: this.evidence.summarize(response),
        policy: { allowed: true, dryRun: false },
        timestamps: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
        },
      });
      return updated;
    } catch (error) {
      await this.evidence.write({
        requestHash,
        operation,
        toolName: tool.name,
        args,
        policy: { allowed: false, dryRun: false, reason: 'execution-error' },
        timestamps: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
        },
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async resolveCurrent(
    ref: TaskRef,
    preconditions?: TaskUpdatePreconditions,
  ): Promise<TaskRef> {
    if (!preconditions) {
      return ref;
    }
    if (ref.status || ref.notes) {
      return ref;
    }
    const results = await this.searchTasks(ref.id, { limit: 1 });
    return results[0] ?? ref;
  }
}
