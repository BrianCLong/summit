"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const investigative_thread_quality_agent_js_1 = __importDefault(require("../src/ai/investigative-thread-quality-agent.js"));
(0, globals_1.describe)('InvestigativeThreadQualityAgent', () => {
    (0, globals_1.test)('scores and updates graph metadata', async () => {
        const run = globals_1.jest.fn();
        run.mockResolvedValue({});
        const close = globals_1.jest.fn();
        const session = { run, close };
        const driver = { session: () => session };
        const agent = new investigative_thread_quality_agent_js_1.default(driver);
        const thread = {
            id: 't1',
            investigationId: 'inv1',
            messages: [
                {
                    text: 'First statement with reference http://example.com',
                    evidence: ['http://example.com'],
                },
                { text: 'Second statement repeats' },
                { text: 'Second statement repeats' },
            ],
        };
        const scores = await agent.scoreAndUpdate(thread);
        (0, globals_1.expect)(scores.evidence).toBeCloseTo(1 / 3, 5);
        (0, globals_1.expect)(scores.redundancy).toBeGreaterThan(0);
        (0, globals_1.expect)(run).toHaveBeenCalled();
    });
});
