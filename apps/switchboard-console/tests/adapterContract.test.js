"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ClaudeAdapter_1 = require("../src/adapters/ClaudeAdapter");
const FakeAdapter_1 = require("../src/adapters/FakeAdapter");
const GeminiAdapter_1 = require("../src/adapters/GeminiAdapter");
(0, vitest_1.describe)('provider adapter contract', () => {
    (0, vitest_1.it)('streams output and tool actions', async () => {
        const adapter = new FakeAdapter_1.FakeAdapter();
        const session = await adapter.startSession({
            sessionId: 'session-123',
            systemPrompt: 'test',
        });
        let output = '';
        let toolAction = '';
        await session.sendMessage('ping', {
            onToken: (token) => {
                output += token;
            },
            onToolAction: (action) => {
                toolAction = action.command ?? '';
            },
        });
        (0, vitest_1.expect)(output).toContain('RESPONSE:ok');
        (0, vitest_1.expect)(toolAction).toContain('echo');
    });
    (0, vitest_1.it)('stubs fail gracefully for unimplemented adapters', async () => {
        const claude = new ClaudeAdapter_1.ClaudeAdapter();
        const gemini = new GeminiAdapter_1.GeminiAdapter();
        (0, vitest_1.expect)(await claude.isAvailable()).toBe(false);
        (0, vitest_1.expect)(await gemini.isAvailable()).toBe(false);
        await (0, vitest_1.expect)(claude.startSession()).rejects.toThrow(/not implemented/i);
        await (0, vitest_1.expect)(gemini.startSession()).rejects.toThrow(/not implemented/i);
    });
});
