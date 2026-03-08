"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crystalOrchestrator = exports.CrystalSessionOrchestrator = void 0;
const events_1 = require("events");
const crypto_1 = require("crypto");
const adapter_registry_js_1 = require("./adapter-registry.js");
const provenance_ledger_js_1 = require("./provenance-ledger.js");
const slo_metrics_js_1 = require("./slo-metrics.js");
const worktree_engine_js_1 = require("./worktree-engine.js");
const types_js_1 = require("./types.js");
class RunLogEmitter extends events_1.EventEmitter {
    emitLog(event) {
        this.emit('log', event);
    }
    onLog(listener) {
        this.on('log', listener);
        return () => this.off('log', listener);
    }
}
function clone(value) {
    return structuredClone
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
}
function buildPanels(presets) {
    const items = presets?.length
        ? presets
        : [
            { type: types_js_1.PanelType.AGENT, name: 'Claude Code' },
            { type: types_js_1.PanelType.AGENT, name: 'Codex' },
            { type: types_js_1.PanelType.TERMINAL, name: 'Terminal' },
            { type: types_js_1.PanelType.DIFF, name: 'Diff Viewer' },
            { type: types_js_1.PanelType.EDITOR, name: 'Editor' },
            { type: types_js_1.PanelType.LOGS, name: 'Run Logs' },
        ];
    return items.map((panel, index) => ({
        id: (0, crypto_1.randomUUID)(),
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
function buildRunScripts(defs) {
    return (defs || []).map((def) => ({
        id: (0, crypto_1.randomUUID)(),
        name: def.name,
        command: def.command,
        timeoutMs: def.timeoutMs,
        environment: def.environment,
    }));
}
function buildAgents(adapters) {
    const adapterKeys = adapters?.length ? adapters : ['claude-code', 'codex'];
    return adapterKeys.map((key) => {
        const adapter = adapter_registry_js_1.adapterRegistry.get(key);
        return {
            id: (0, crypto_1.randomUUID)(),
            adapterKey: adapter.key,
            status: 'idle',
            capabilities: adapter.capabilities(),
            createdAt: new Date().toISOString(),
        };
    });
}
function buildAttachments(input) {
    return (input || []).map((attachment) => ({
        id: (0, crypto_1.randomUUID)(),
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
class CrystalSessionOrchestrator {
    sessions = new Map();
    runLogEmitters = new Map();
    deps;
    constructor(deps) {
        this.deps = {
            worktreeEngine: worktree_engine_js_1.worktreeEngine,
            metrics: slo_metrics_js_1.sloMetrics,
            ...deps,
        };
    }
    listSessions() {
        return Array.from(this.sessions.values()).map((session) => clone(session));
    }
    getSession(id) {
        const session = this.sessions.get(id);
        return session ? clone(session) : undefined;
    }
    getAdapters() {
        return adapter_registry_js_1.adapterRegistry.list().map((adapter) => ({
            key: adapter.key,
            name: adapter.name,
            description: `${adapter.name} adapter`,
            capabilities: adapter.capabilities(),
        }));
    }
    getCostSnapshot() {
        return this.deps.metrics.getCostSnapshot();
    }
    async createSession(input) {
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
        const sessionId = (0, crypto_1.randomUUID)();
        const now = new Date().toISOString();
        const provenance = provenance_ledger_js_1.provenanceLedger.record('crystal', 'session-created', {
            sessionId,
            worktreeId: worktree.id,
            projectPath: input.projectPath,
            agents: agents.map((agent) => agent.adapterKey),
        });
        const session = {
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
    async startRun(input) {
        const session = this.requireSession(input.sessionId);
        const definition = session.runScripts.find((script) => script.id === input.runDefinitionId);
        if (!definition) {
            throw new Error(`Unknown run script ${input.runDefinitionId}`);
        }
        const command = input.overrides?.command || definition.command;
        const environment = {
            ...definition.environment,
            ...input.overrides?.environment,
        };
        const timeoutMs = input.overrides?.timeoutMs ?? definition.timeoutMs ?? 5 * 60 * 1000;
        const runId = (0, crypto_1.randomUUID)();
        const startedAt = new Date().toISOString();
        const provenance = provenance_ledger_js_1.provenanceLedger.record('crystal', 'run-started', {
            sessionId: session.id,
            runId,
            command,
            environment,
            timeoutMs,
        });
        const run = {
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
        const pushLog = (stream, message) => {
            const entry = {
                id: (0, crypto_1.randomUUID)(),
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
        provenance_ledger_js_1.provenanceLedger.record('crystal', 'run-completed', {
            sessionId: session.id,
            runId: run.id,
            exitCode: run.exitCode,
        });
        return clone(run);
    }
    async recordMessage(input) {
        const session = this.requireSession(input.sessionId);
        const agent = session.agents.find((candidate) => candidate.id === input.agentId);
        if (!agent) {
            throw new Error(`Unknown agent ${input.agentId}`);
        }
        const adapter = adapter_registry_js_1.adapterRegistry.get(agent.adapterKey);
        const role = input.role === 'system' ? 'system' : 'user';
        const userMessage = {
            id: (0, crypto_1.randomUUID)(),
            agentId: agent.id,
            role,
            content: input.content,
            createdAt: new Date().toISOString(),
            attachmentIds: input.attachmentIds,
            richOutput: input.richOutput,
        };
        session.messages.push(userMessage);
        provenance_ledger_js_1.provenanceLedger.record('crystal', 'user-message', userMessage);
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
    async summarize(sessionId, agentId) {
        const session = this.requireSession(sessionId);
        const agent = session.agents.find((candidate) => candidate.id === agentId);
        if (!agent) {
            throw new Error(`Unknown agent ${agentId}`);
        }
        const adapter = adapter_registry_js_1.adapterRegistry.get(agent.adapterKey);
        return adapter.summarizeThread(sessionId, agentId);
    }
    updatePanels(input) {
        const session = this.requireSession(input.sessionId);
        const layoutMap = new Map(input.panels.map((panel) => [panel.panelId, panel.layout]));
        session.panels = session.panels.map((panel) => layoutMap.has(panel.id)
            ? { ...panel, layout: layoutMap.get(panel.id) }
            : panel);
        this.touch(session);
        provenance_ledger_js_1.provenanceLedger.record('crystal', 'panel-layout-updated', {
            sessionId: session.id,
            panels: input.panels,
        });
        return clone(session);
    }
    async closeSession(input) {
        const session = this.requireSession(input.sessionId);
        session.status = 'closing';
        this.touch(session);
        await this.deps.worktreeEngine.deleteQueued(session.worktree.id);
        session.status = 'closed';
        this.touch(session);
        provenance_ledger_js_1.provenanceLedger.record('crystal', 'session-closed', {
            sessionId: session.id,
        });
        return clone(session);
    }
    subscribeToRunLogs(sessionId, runId, listener) {
        const emitter = this.getEmitter(sessionId, runId);
        return emitter.onLog(listener);
    }
    getEmitter(sessionId, runId) {
        const key = `${sessionId}:${runId}`;
        if (!this.runLogEmitters.has(key)) {
            this.runLogEmitters.set(key, new RunLogEmitter());
        }
        return this.runLogEmitters.get(key);
    }
    requireSession(id) {
        const session = this.sessions.get(id);
        if (!session) {
            throw new Error(`Unknown session ${id}`);
        }
        return session;
    }
    touch(session) {
        session.updatedAt = new Date().toISOString();
        session.slo = this.deps.metrics.getSLOSnapshot();
        session.cost = this.deps.metrics.getCostSnapshot();
    }
}
exports.CrystalSessionOrchestrator = CrystalSessionOrchestrator;
exports.crystalOrchestrator = new CrystalSessionOrchestrator();
