"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeAdapter = void 0;
class FakeAdapter {
    id = 'fake';
    displayName = 'Fake Adapter';
    async isAvailable() {
        return true;
    }
    async startSession(options) {
        const basePrompt = options.systemPrompt;
        return {
            sendMessage: async (input, handlers) => {
                const tokens = [
                    `SYSTEM:${basePrompt}`,
                    '\n',
                    `USER:${input}`,
                    '\n',
                    'RESPONSE:ok',
                ];
                for (const token of tokens) {
                    handlers.onToken(token);
                    await Promise.resolve();
                }
                const action = {
                    type: 'tool_exec',
                    command: 'echo "fake"',
                };
                handlers.onToolAction?.(action);
            },
            stop: async () => Promise.resolve(),
        };
    }
}
exports.FakeAdapter = FakeAdapter;
