"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeAdapter = void 0;
class ClaudeAdapter {
    id = 'claude';
    displayName = 'Claude Code CLI';
    async isAvailable() {
        return false;
    }
    async startSession() {
        // TODO: implement Claude CLI adapter with streaming and tool action parsing.
        throw new Error('Claude adapter not implemented yet.');
    }
}
exports.ClaudeAdapter = ClaudeAdapter;
