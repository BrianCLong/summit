"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adapterRegistry = exports.AdapterRegistry = void 0;
const crypto_1 = require("crypto");
const provenance_ledger_js_1 = require("./provenance-ledger.js");
class BaseAdapter {
    async init() {
        // no-op for in-memory adapters
    }
    capabilities() {
        return ['code-edit', 'diff', 'run-script', 'attachments'];
    }
    async startThread(sessionId, agentId) {
        provenance_ledger_js_1.provenanceLedger.record(this.key, 'start-thread', { sessionId, agentId });
    }
    async sendMessage(options) {
        const response = {
            id: (0, crypto_1.randomUUID)(),
            agentId: options.agentId,
            role: 'assistant',
            content: this.generateResponse(options.content),
            createdAt: new Date().toISOString(),
            attachmentIds: options.attachments,
            richOutput: this.maybeGenerateRichOutput(options.content),
        };
        provenance_ledger_js_1.provenanceLedger.record(this.key, 'assistant-message', response);
        return response;
    }
    async attach(options) {
        const id = (0, crypto_1.randomUUID)();
        provenance_ledger_js_1.provenanceLedger.record(this.key, 'attach', { ...options, id });
        return id;
    }
    async stop(sessionId, agentId) {
        provenance_ledger_js_1.provenanceLedger.record(this.key, 'stop', { sessionId, agentId });
    }
    async summarizeThread(sessionId, agentId) {
        const payload = {
            kind: 'markdown',
            title: `Summary for ${agentId}`,
            data: `Session ${sessionId} summary generated at ${new Date().toISOString()}`,
        };
        provenance_ledger_js_1.provenanceLedger.record(this.key, 'summarize-thread', {
            sessionId,
            agentId,
        });
        return payload;
    }
    generateResponse(content) {
        return `Acknowledged: ${content}`;
    }
    maybeGenerateRichOutput(content) {
        if (content.includes('table:')) {
            return {
                kind: 'table',
                data: {
                    headers: ['Column', 'Value'],
                    rows: content
                        .split('table:')[1]
                        .split(',')
                        .map((entry) => {
                        const [column, value] = entry
                            .split('=')
                            .map((part) => part.trim());
                        return { column, value };
                    }),
                },
            };
        }
        if (content.includes('diagram:')) {
            return {
                kind: 'diagram',
                data: {
                    mermaid: content.split('diagram:')[1].trim(),
                },
            };
        }
        return undefined;
    }
}
class ClaudeCodeAdapter extends BaseAdapter {
    key = 'claude-code';
    name = 'Claude Code';
    capabilities() {
        return [...super.capabilities(), 'semantic-diff', 'lsp-integration'];
    }
    generateResponse(content) {
        return `Claude synthesized a plan for: ${content}`;
    }
}
class CodexAdapter extends BaseAdapter {
    key = 'codex';
    name = 'OpenAI Codex';
    capabilities() {
        return [...super.capabilities(), 'quick-fix', 'tests'];
    }
    generateResponse(content) {
        return `Codex proposed implementation for: ${content}`;
    }
}
class AdapterRegistry {
    adapters = new Map();
    constructor(initialAdapters = []) {
        initialAdapters.forEach((adapter) => this.register(adapter));
    }
    register(adapter) {
        this.adapters.set(adapter.key, adapter);
    }
    get(key) {
        const adapter = this.adapters.get(key);
        if (!adapter) {
            throw new Error(`Unknown adapter ${key}`);
        }
        return adapter;
    }
    list() {
        return Array.from(this.adapters.values());
    }
}
exports.AdapterRegistry = AdapterRegistry;
exports.adapterRegistry = new AdapterRegistry([
    new ClaudeCodeAdapter(),
    new CodexAdapter(),
]);
