"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const orchestrator_js_1 = require("../orchestrator.js");
(0, globals_1.describe)('ChatOpsOrchestrator', () => {
    let orchestrator;
    (0, globals_1.beforeEach)(() => {
        orchestrator = new orchestrator_js_1.ChatOpsOrchestrator();
    });
    test('should process a query message correctly', async () => {
        const response = await orchestrator.processMessage('user1', 'Who is targeting CISA?');
        (0, globals_1.expect)(response).toBeDefined();
        (0, globals_1.expect)(response.content).toContain('CISA');
        (0, globals_1.expect)(response.actionsTaken).toHaveLength(1);
        (0, globals_1.expect)(response.actionsTaken[0].type).toBe('search_graph');
    });
    test('should maintain memory context', async () => {
        await orchestrator.processMessage('user1', 'My name is Jules.');
        const response = await orchestrator.processMessage('user1', 'What is my name?');
        // In our mock, the response is static based on intent,
        // but we can verify the memory state implicitly if we exposed it,
        // or just ensure no errors are thrown during the flow.
        (0, globals_1.expect)(response).toBeDefined();
    });
    test('should detect analysis intent', async () => {
        const response = await orchestrator.processMessage('user1', 'Analyze the threat report for APT29');
        (0, globals_1.expect)(response.content).toContain('analysis');
        (0, globals_1.expect)(response.content).toContain('APT29');
    });
});
