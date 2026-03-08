"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAdapter = void 0;
class GeminiAdapter {
    id = 'gemini';
    displayName = 'Gemini CLI';
    async isAvailable() {
        return false;
    }
    async startSession() {
        // TODO: implement Gemini CLI adapter with streaming and tool action parsing.
        throw new Error('Gemini adapter not implemented yet.');
    }
}
exports.GeminiAdapter = GeminiAdapter;
