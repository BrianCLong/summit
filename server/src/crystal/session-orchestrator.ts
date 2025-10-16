import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { adapterRegistry } from './adapter-registry.js';
import { provenanceLedger } from './provenance-ledger.js';
import { sloMetrics, SLOMetrics } from './slo-metrics.js';
import { worktreeEngine, WorktreeEngine } from './worktree-engine.js';
import {
  PanelType,
  type AgentRegistration,
  type AssistantMessage,
  type CloseSessionInput,
  type CreateSessionInput,
  type CrystalPanel,
  type CrystalSession,
  type RecordMessageInput,
  type RunExecution,
  type RunLogEntry,
  type RunScriptDefinition,
  type StartRunInput,
  type UpdatePanelsInput,
  type PanelLayout,
} from './types.js';

interface RunLogEvent {
  sessionId: string;
  runId: string;
  entry: RunLogEntry;
}

class RunLogEmitter extends EventEmitter {
  emitLog(event: RunLogEvent) {
    this.emit('log', event);
  }

  onLog(listener: (event: RunLogEvent) => void) {
    this.on('log', listener);
    return () => this.off('log', listener);
  }
}

function clone<T>(value: T): T {
  return structuredClone
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function buildPanels(
  presets?: CreateSessionInput['panelPresets'],
): CrystalPanel[] {
  const items = presets?.length
    ? presets
    : [
        { type: PanelType.AGENT, name: 'Claude Code' },
        { type: PanelType.AGENT, name: 'Codex' },
        { type: PanelType.TERMINAL, name: 'Terminal' },
        { type: PanelType.DIFF, name: 'Diff Viewer' },
        { type: PanelType.EDITOR, name: 'Editor' },
        { type: PanelType.LOGS, name: 'Run Logs' },
      ];
  return items.map((panel, index) => ({
    id: randomUUID(),
    type: panel.type,
    name: panel.name ?? panel.type,
    layout: {
      x: (index % 2) * 6,
      y: Math.floor(index / 2) * 6,
      w: 6,
      h: 6,
      preset: panel.preset,
    },
  }));
}

function buildRunScripts(
  defs?: CreateSessionInput['runScripts'],
): RunScriptDefinition[] {
  return (defs || []).map((def) => ({
    id: randomUUID(),
    name: def.name,
    command: def.command,
    timeoutMs: def.timeoutMs,
    environment: def.environment,
  }));
}

function buildAgents(adapters?: string[]): AgentRegistration[] {
  const adapterKeys = adapters?.length ? adapters : ['claude-code', 'codex'];
  return adapterKeys.map((key) => {
    const adapter = adapterRegistry.get(key);
    return {
      id: randomUUID(),
      adapterKey: adapter.key,
      status: 'idle',
      capabilities: adapter.capabilities(),
      createdAt: new Date().toISOString(),
    } satisfies AgentRegistration;
  });
}

function buildAttachments(input: CreateSessionInput['attachments']) {
  return (input || []).map((attachment) => ({
    id: randomUUID(),
    type: attachment.type,
    name: attachment.name,
    size: attachment.size,
    contentType: attachment.contentType,
    purpose: attachment.purpose,
    retention: attachment.retention || 'standard-365d',
    uri: attachment.uri,
    createdAt: new Date().toISOString(),
  }));
}

export interface OrchestratorDependencies {
  worktreeEngine: WorktreeEngine;
  metrics: SLOMetrics;
}

export class CrystalSessionOrchestrator {
  private sessions = new Map<string, CrystalSession>();
  private runLogEmitters = new Map<string, RunLogEmitter>();
  private readonly deps: OrchestratorDependencies;

  constructor(deps?: Partial<OrchestratorDependencies>) {
    this.deps = {
      worktreeEngine,
      metrics: sloMetrics,
      ...deps,
    } as OrchestratorDependencies;
  }

  listSessions(): CrystalSession[] {
    return Array.from(this.sessions.values()).map((session) => clone(session));
  }

  getSession(id: string): CrystalSession | undefined {
    const session = this.sessions.get(id);
    return session ? clone(session) : undefined;
  }

  getAdapters() {
    return adapterRegistry.list().map((adapter) => ({
      key: adapter.key,
      name: adapter.name,
      description: `${adapter.name} adapter`,
      capabilities: adapter.capabilities(),
    }));
  }

  getCostSnapshot() {
    return this.deps.metrics.getCostSnapshot();
  }

  async createSession(input: CreateSessionInput): Promise<CrystalSession> {
    if (!input.projectPath) {
      throw new Error('projectPath is required');
    }

    const worktree = await this.deps.worktreeEngine.create({
      sessionId: 'pending',
      projectPath: input.projectPath,
      mainBranch: input.mainBranch,
    });

    const runScripts = buildRunScripts(input.runScripts);
    const agents = buildAgents(input.adapters);
    const panels = buildPanels(input.panelPresets);
    const attachments = buildAttachments(input.attachments);

    const sessionId = randomUUID();
    const now = new Date().toISOString();
    const provenance = provenanceLedger.record('crystal', 'session-created', {
      sessionId,
      worktreeId: worktree.id,
      projectPath: input.projectPath,
      agents: agents.map((agent) => agent.adapterKey),
    });

    const session: CrystalSession = {
      id: sessionId,
      name: input.name,
      description: input.description,
      status: 'active',
      theme: input.theme || 'light',
      createdAt: now,
      updatedAt: now,
      purposeTags: input.purposeTags?.length
        ? input.purposeTags
        : ['investigation'],
      retention: input.retention || 'standard-365d',
      worktree,
      panels,
      attachments,
      runScripts,
      runs: [],
      agents,
      messages: [],
      provenanceId: provenance.id,
      slo: this.deps.metrics.getSLOSnapshot(),
      cost: this.deps.metrics.getCostSnapshot(),
    };

    this.sessions.set(sessionId, session);
    this.deps.metrics.recordCost('dev', 25);
    this.deps.metrics.observeGateway('write', 120);

    return clone(session);
  }

  async startRun(input: StartRunInput): Promise<RunExecution> {
    const session = this.requireSession(input.sessionId);
    const definition = session.runScripts.find(
      (script) => script.id === input.runDefinitionId,
    );
    if (!definition) {
      throw new Error(`Unknown run script ${input.runDefinitionId}`);
    }

    const command = input.overrides?.command || definition.command;
    const environment = {
      ...definition.environment,
      ...input.overrides?.environment,
    };
    const timeoutMs =
      input.overrides?.timeoutMs ?? definition.timeoutMs ?? 5 * 60 * 1000;

    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    const provenance = provenanceLedger.record('crystal', 'run-started', {
      sessionId: session.id,
      runId,
      command,
      environment,
      timeoutMs,
    });

    const run: RunExecution = {
      id: runId,
      definitionId: definition.id,
      status: 'running',
      startedAt,
      provenanceId: provenance.id,
      logs: [],
    };

    session.runs = [run, ...session.runs];
    this.touch(session);

    const emitter = this.getEmitter(session.id, run.id);
    const pushLog = (stream: RunLogEntry['stream'], message: string) => {
      const entry: RunLogEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        stream,
        message,
      };
      run.logs.push(entry);
      emitter.emitLog({ sessionId: session.id, runId: run.id, entry });
    };

    pushLog('system', `Running ${command}`);
    const phases = command.split('&&').map((segment) => segment.trim());
    for (const phase of phases) {
      pushLog('stdout', `$ ${phase}`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    pushLog('stdout', 'Execution completed successfully.');
    run.status = 'succeeded';
    run.exitCode = 0;
    run.completedAt = new Date().toISOString();
    this.touch(session);

    this.deps.metrics.observeGateway('read', 180);
    this.deps.metrics.observeGraph(2, 240);
    this.deps.metrics.recordCost('dev', 5);

    provenanceLedger.record('crystal', 'run-completed', {
      sessionId: session.id,
      runId: run.id,
      exitCode: run.exitCode,
    });

    return clone(run);
  }

  async recordMessage(input: RecordMessageInput): Promise<AssistantMessage> {
    const session = this.requireSession(input.sessionId);
    const agent = session.agents.find(
      (candidate) => candidate.id === input.agentId,
    );
    if (!agent) {
      throw new Error(`Unknown agent ${input.agentId}`);
    }
    const adapter = adapterRegistry.get(agent.adapterKey);

    const role = input.role === 'system' ? 'system' : 'user';
    const userMessage: AssistantMessage = {
      id: randomUUID(),
      agentId: agent.id,
      role,
      content: input.content,
      createdAt: new Date().toISOString(),
      attachmentIds: input.attachmentIds,
      richOutput: input.richOutput,
    };
    session.messages.push(userMessage);
    provenanceLedger.record('crystal', 'user-message', userMessage);

    const assistantMessage = await adapter.sendMessage({
      sessionId: session.id,
      agentId: agent.id,
      content: input.content,
      attachments: input.attachmentIds,
    });
    session.messages.push(assistantMessage);
    agent.status = 'idle';
    this.touch(session);

    this.deps.metrics.observeGateway('read', 150);
    this.deps.metrics.recordCost('llm', 1.2);

    return clone(assistantMessage);
  }

  async summarize(sessionId: string, agentId: string) {
    const session = this.requireSession(sessionId);
    const agent = session.agents.find((candidate) => candidate.id === agentId);
    if (!agent) {
      throw new Error(`Unknown agent ${agentId}`);
    }
    const adapter = adapterRegistry.get(agent.adapterKey);
    return adapter.summarizeThread(sessionId, agentId);
  }

  updatePanels(input: UpdatePanelsInput): CrystalSession {
    const session = this.requireSession(input.sessionId);
    const layoutMap = new Map<string, PanelLayout>(
      input.panels.map((panel) => [panel.panelId, panel.layout]),
    );
    session.panels = session.panels.map((panel) =>
      layoutMap.has(panel.id)
        ? { ...panel, layout: layoutMap.get(panel.id)! }
        : panel,
    );
    this.touch(session);
    provenanceLedger.record('crystal', 'panel-layout-updated', {
      sessionId: session.id,
      panels: input.panels,
    });
    return clone(session);
  }

  async closeSession(input: CloseSessionInput): Promise<CrystalSession> {
    const session = this.requireSession(input.sessionId);
    session.status = 'closing';
    this.touch(session);
    await this.deps.worktreeEngine.deleteQueued(session.worktree.id);
    session.status = 'closed';
    this.touch(session);
    provenanceLedger.record('crystal', 'session-closed', {
      sessionId: session.id,
    });
    return clone(session);
  }

  subscribeToRunLogs(
    sessionId: string,
    runId: string,
    listener: (event: RunLogEvent) => void,
  ): () => void {
    const emitter = this.getEmitter(sessionId, runId);
    return emitter.onLog(listener);
  }

  private getEmitter(sessionId: string, runId: string): RunLogEmitter {
    const key = `${sessionId}:${runId}`;
    if (!this.runLogEmitters.has(key)) {
      this.runLogEmitters.set(key, new RunLogEmitter());
    }
    return this.runLogEmitters.get(key)!;
  }

  private requireSession(id: string): CrystalSession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Unknown session ${id}`);
    }
    return session;
  }

  private touch(session: CrystalSession) {
    session.updatedAt = new Date().toISOString();
    session.slo = this.deps.metrics.getSLOSnapshot();
    session.cost = this.deps.metrics.getCostSnapshot();
  }
}

export const crystalOrchestrator = new CrystalSessionOrchestrator();
