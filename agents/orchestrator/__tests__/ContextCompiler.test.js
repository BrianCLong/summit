"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ContextCompiler_js_1 = require("../src/context/ContextCompiler.js");
const HistoryProcessor_js_1 = require("../src/context/processors/HistoryProcessor.js");
const InstructionProcessor_js_1 = require("../src/context/processors/InstructionProcessor.js");
const MemoryProcessor_js_1 = require("../src/context/processors/MemoryProcessor.js");
(0, vitest_1.describe)('ContextCompiler', () => {
    // 1. Setup Mock Session
    const mockSession = {
        id: 'session-123',
        userId: 'user-456',
        events: [
            {
                id: '1',
                type: 'message',
                role: 'user',
                content: 'Hello, world!',
                timestamp: new Date(),
            },
            {
                id: '2',
                type: 'message',
                role: 'assistant',
                content: 'Hello! How can I help you?',
                timestamp: new Date(),
            }
        ],
        metadata: {
            systemInstructions: 'You are a helpful assistant.'
        },
        variables: {}
    };
    (0, vitest_1.it)('should compile a simple working context', async () => {
        const compiler = new ContextCompiler_js_1.ContextCompiler([
            new InstructionProcessor_js_1.InstructionProcessor(['Base instruction']),
            new HistoryProcessor_js_1.HistoryProcessor(),
        ]);
        const result = await compiler.compile(mockSession, {
            model: 'test-model',
            tokenLimit: 1000
        });
        // Assertions
        (0, vitest_1.expect)(result.messages).toHaveLength(3); // System, User, Assistant
        (0, vitest_1.expect)(result.messages[0].role).toBe('system');
        (0, vitest_1.expect)(result.messages[0].content).toContain('Base instruction');
        (0, vitest_1.expect)(result.messages[0].content).toContain('You are a helpful assistant');
        (0, vitest_1.expect)(result.messages[1].role).toBe('user');
        (0, vitest_1.expect)(result.messages[1].content).toBe('Hello, world!');
        (0, vitest_1.expect)(result.messages[2].role).toBe('assistant');
        (0, vitest_1.expect)(result.messages[2].content).toBe('Hello! How can I help you?');
    });
    (0, vitest_1.it)('should handle memory injection', async () => {
        const sessionWithMemory = { ...mockSession, metadata: {
                relevantMemories: [{ id: 'mem1', content: 'User likes pizza', score: 0.9 }]
            } };
        const compiler = new ContextCompiler_js_1.ContextCompiler([
            new MemoryProcessor_js_1.MemoryProcessor(),
            new HistoryProcessor_js_1.HistoryProcessor()
        ]);
        const result = await compiler.compile(sessionWithMemory, { model: 'test-model' });
        // MemoryProcessor injects memories as a system message
        (0, vitest_1.expect)(result.messages).toHaveLength(3); // System (Memory), User, Assistant
        (0, vitest_1.expect)(result.messages[0].role).toBe('system');
        (0, vitest_1.expect)(result.messages[0].content).toContain('Relevant Knowledge:');
        (0, vitest_1.expect)(result.messages[0].content).toContain('User likes pizza');
    });
});
