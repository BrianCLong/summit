"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const session_orchestrator_js_1 = require("../session-orchestrator.js");
const worktree_engine_js_1 = require("../worktree-engine.js");
const slo_metrics_js_1 = require("../slo-metrics.js");
const types_js_1 = require("../types.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('CrystalSessionOrchestrator', () => {
    let repoDir;
    let orchestrator;
    (0, globals_1.beforeEach)(async () => {
        repoDir = await (0, promises_1.mkdtemp)(path.join(os.tmpdir(), 'crystal-test-'));
        orchestrator = new session_orchestrator_js_1.CrystalSessionOrchestrator({
            worktreeEngine: new worktree_engine_js_1.WorktreeEngine(repoDir),
            metrics: new slo_metrics_js_1.SLOMetrics(),
        });
    });
    (0, globals_1.afterEach)(async () => {
        await (0, promises_1.rm)(repoDir, { recursive: true, force: true });
    });
    (0, globals_1.it)('creates a session with isolated worktree and default panels', async () => {
        const session = await orchestrator.createSession({
            name: 'Crystal Demo',
            projectPath: '.',
            purposeTags: ['demo'],
            attachments: [
                {
                    type: types_js_1.AttachmentType.TEXT,
                    name: 'readme.txt',
                    size: 12,
                    contentType: 'text/plain',
                    purpose: 'demo',
                },
            ],
            runScripts: [
                {
                    name: 'unit-tests',
                    command: 'npm test',
                },
            ],
        });
        (0, globals_1.expect)(session.panels.some((panel) => panel.type === types_js_1.PanelType.DIFF)).toBe(true);
        (0, globals_1.expect)(session.agents).toHaveLength(2);
        const worktreeStat = await (0, promises_1.stat)(session.worktree.worktreePath);
        (0, globals_1.expect)(worktreeStat.isDirectory()).toBe(true);
    });
    (0, globals_1.it)('streams run logs via subscription', async () => {
        const session = await orchestrator.createSession({
            name: 'Streaming Demo',
            projectPath: '.',
            runScripts: [
                {
                    name: 'build',
                    command: 'npm install && npm run build',
                },
            ],
        });
        const runPromise = orchestrator.startRun({
            sessionId: session.id,
            runDefinitionId: session.runScripts[0].id,
        });
        const activeSession = orchestrator.getSession(session.id);
        const runId = activeSession.runs[0].id;
        const received = [];
        orchestrator.subscribeToRunLogs(session.id, runId, (event) => {
            received.push(event.entry.message);
        });
        const run = await runPromise;
        (0, globals_1.expect)(run.logs.length).toBeGreaterThan(0);
        (0, globals_1.expect)(received.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('records assistant responses via adapter registry', async () => {
        const session = await orchestrator.createSession({
            name: 'Adapter Demo',
            projectPath: '.',
        });
        const message = await orchestrator.recordMessage({
            sessionId: session.id,
            agentId: session.agents[0].id,
            role: 'user',
            content: 'Write a function to compute factorial',
        });
        (0, globals_1.expect)(message.role).toBe('assistant');
        (0, globals_1.expect)(message.content).toContain('factorial');
    });
});
