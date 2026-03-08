"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleSession = void 0;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const adapters_1 = require("../adapters");
const EventLogger_1 = require("../logging/EventLogger");
const TranscriptWriter_1 = require("../logging/TranscriptWriter");
const PolicyGate_1 = require("../policy/PolicyGate");
const SkillsetStore_1 = require("../skillsets/SkillsetStore");
const EvidenceBundler_1 = require("./EvidenceBundler");
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
const nowIso = () => new Date().toISOString();
const createSessionId = () => `${new Date().toISOString().replace(/[:.]/g, '-')}-${(0, node_crypto_1.randomUUID)()}`;
class ConsoleSession {
    sessionId;
    sessionDir;
    eventLogger;
    transcript;
    policyGate;
    skillsetStore;
    adapters;
    provider = null;
    providerSession = null;
    skillset = null;
    constructor(options) {
        this.sessionId = options.sessionId ?? createSessionId();
        this.sessionDir = node_path_1.default.join(options.sessionRoot, this.sessionId);
        this.eventLogger = new EventLogger_1.EventLogger(this.sessionDir);
        this.transcript = new TranscriptWriter_1.TranscriptWriter(this.sessionDir);
        this.policyGate = new PolicyGate_1.PolicyGate();
        this.skillsetStore = new SkillsetStore_1.SkillsetStore(options.skillsetDir);
        this.adapters = options.adapters ?? (0, adapters_1.defaultAdapters)();
    }
    async init(resume = false) {
        await (0, promises_1.mkdir)(this.sessionDir, { recursive: true });
        await this.eventLogger.init();
        await this.transcript.init();
        await this.logEvent('session_start', { resume });
    }
    get id() {
        return this.sessionId;
    }
    get dir() {
        return this.sessionDir;
    }
    async handleInput(line) {
        const trimmed = line.trim();
        if (!trimmed) {
            return null;
        }
        if (trimmed.startsWith('/agent')) {
            const [, agent] = trimmed.split(' ');
            if (!agent) {
                return 'Usage: /agent <claude|codex|gemini>';
            }
            await this.switchAgent(agent);
            return `Agent set to ${agent}`;
        }
        if (trimmed.startsWith('/skillset')) {
            const [, skillsetName] = trimmed.split(' ');
            if (!skillsetName) {
                return 'Usage: /skillset <name>';
            }
            await this.switchSkillset(skillsetName);
            return `Skillset set to ${skillsetName}`;
        }
        if (trimmed.startsWith('/run')) {
            const command = trimmed.replace('/run', '').trim();
            if (!command) {
                return 'Usage: /run <command>';
            }
            return this.runCommand(command);
        }
        if (trimmed.startsWith('/evidence')) {
            const evidencePath = await this.emitEvidence();
            return `Evidence bundle created at ${evidencePath}`;
        }
        if (trimmed.startsWith('/resume')) {
            return 'Use switchboard-console --resume <session-id> to resume sessions.';
        }
        if (trimmed === '/exit') {
            await this.end();
            return 'Session ended.';
        }
        return this.sendMessage(trimmed);
    }
    async end() {
        await this.logEvent('session_end', {});
        if (this.providerSession) {
            await this.providerSession.stop();
        }
    }
    async switchAgent(agent) {
        const next = (0, adapters_1.adapterById)(this.adapters, agent);
        if (!next) {
            throw new Error(`Unknown agent: ${agent}`);
        }
        const available = await next.isAvailable();
        if (!available) {
            throw new Error(`${next.displayName} is not available in this session.`);
        }
        this.provider = next;
        this.providerSession = null;
        await this.logEvent('step_start', { action: 'agent_switch', agent });
    }
    async switchSkillset(skillsetName) {
        const skillsetFile = await this.skillsetStore.getWithPath(skillsetName);
        this.skillset = skillsetFile.skillset;
        await this.logEvent('file_read', {
            target: skillsetFile.path,
            reason: 'skillset_load',
        });
        this.providerSession = null;
        await this.logEvent('step_start', {
            action: 'skillset_switch',
            skillset: this.skillset.name,
        });
    }
    async sendMessage(message) {
        if (!this.provider) {
            await this.switchAgent('codex');
        }
        if (!this.skillset) {
            await this.switchSkillset('senior-swe');
        }
        if (!this.providerSession) {
            this.providerSession = await this.provider.startSession({
                sessionId: this.sessionId,
                systemPrompt: this.skillset.systemPrompt,
            });
        }
        await this.logEvent('step_start', {
            action: 'message',
            provider: this.provider.id,
        });
        await this.transcript.write(`> ${message}`);
        await this.logFileWrite(this.transcript.path, 'transcript_append');
        let response = '';
        await this.providerSession.sendMessage(message, {
            onToken: (token) => {
                response += token;
            },
            onToolAction: (action) => this.logToolAction(action),
        });
        await this.transcript.write(response);
        await this.logFileWrite(this.transcript.path, 'transcript_append');
        return response;
    }
    async runCommand(command) {
        const decision = this.policyGate.evaluate(command);
        await this.logEvent('tool_exec', {
            command,
            allowed: decision.allowed,
            reason: decision.reason,
            mode: decision.mode,
        });
        if (!decision.allowed) {
            return `Denied by policy: ${decision.reason}`;
        }
        const output = await execAsync(command, { cwd: process.cwd() });
        const commandDir = node_path_1.default.join(this.sessionDir, 'commands');
        await (0, promises_1.mkdir)(commandDir, { recursive: true });
        const outputPath = node_path_1.default.join(commandDir, `${Date.now()}-${command.split(' ')[0]}.log`);
        await (0, promises_1.writeFile)(outputPath, `${output.stdout}\n${output.stderr}`);
        await this.logFileWrite(outputPath, 'command_output');
        if (command.includes('test') || command.includes('smoke')) {
            await this.logEvent('tests_run', { command });
        }
        return output.stdout || output.stderr || 'Command completed.';
    }
    async emitEvidence() {
        const diffPath = await this.captureGitDiff();
        if (diffPath) {
            await this.logFileWrite(diffPath, 'git_diff');
        }
        const bundler = new EvidenceBundler_1.EvidenceBundler(this.sessionDir);
        const evidencePath = await bundler.createBundle();
        await this.logFileWrite(evidencePath, 'evidence_bundle');
        return evidencePath;
    }
    async logToolAction(action) {
        if (action.type === 'tool_exec') {
            await this.logEvent('tool_exec', { action });
            return;
        }
        if (action.type === 'file_read') {
            await this.logEvent('file_read', { action });
            return;
        }
        if (action.type === 'file_write') {
            await this.logEvent('file_write', { action });
        }
    }
    async logFileWrite(target, reason) {
        await this.logEvent('file_write', { target, reason });
    }
    async logEvent(type, data) {
        const event = {
            id: (0, node_crypto_1.randomUUID)(),
            type,
            timestamp: nowIso(),
            sessionId: this.sessionId,
            data,
        };
        await this.eventLogger.log(event);
    }
    async captureGitDiff() {
        try {
            const output = await execAsync('git diff --patch', {
                cwd: process.cwd(),
                maxBuffer: 10 * 1024 * 1024,
            });
            const diffPath = node_path_1.default.join(this.sessionDir, 'git-diff.patch');
            await (0, promises_1.writeFile)(diffPath, output.stdout);
            await this.logEvent('tool_exec', {
                command: 'git diff --patch',
                allowed: true,
                reason: 'evidence_bundle',
                mode: 'allow-all',
            });
            return diffPath;
        }
        catch (error) {
            await this.logEvent('tool_exec', {
                command: 'git diff --patch',
                allowed: false,
                reason: error instanceof Error ? error.message : String(error),
                mode: 'deny-by-default',
            });
            return null;
        }
    }
}
exports.ConsoleSession = ConsoleSession;
