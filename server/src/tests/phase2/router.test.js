"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router_js_1 = require("../../platform/llm-core/router.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('LLM Router', () => {
    const mockProfile = {
        id: 'gpt-4o',
        provider: 'openai',
        modelName: 'gpt-4o',
        maxTokens: 128000,
        costPer1KTokensInput: 0.005,
        costPer1KTokensOutput: 0.015,
        strengths: ['reasoning'],
        weaknesses: [],
        safetyConstraints: []
    };
    const mockRule = {
        id: 'rule-1',
        taskCategory: 'PLANNING',
        preferredModels: ['gpt-4o'],
        fallbackModels: [],
        governanceConstraints: []
    };
    // Mock collector
    const mockRecord = globals_1.jest.fn(async (event) => { return Promise.resolve(); });
    const mockCollector = { record: mockRecord };
    const router = new router_js_1.RouterService([mockProfile], [mockRule], mockCollector);
    (0, globals_1.test)('should route to preferred model for allowed category', async () => {
        const profile = await router.selectModel({
            taskCategory: 'PLANNING',
            tenantId: 't1',
            riskLevel: 'LOW'
        });
        (0, globals_1.expect)(profile.id).toBe('gpt-4o');
    });
    (0, globals_1.test)('should estimate cost correctly', () => {
        const cost = router.estimateCost(mockProfile, 1000, 1000);
        (0, globals_1.expect)(cost).toBeCloseTo(0.02);
    });
    (0, globals_1.test)('should emit cost event when selecting model', async () => {
        await router.selectModel({
            taskCategory: 'PLANNING',
            tenantId: 't1',
            riskLevel: 'LOW'
        });
        (0, globals_1.expect)(mockCollector.record).toHaveBeenCalled();
    });
    (0, globals_1.test)('should throw if no rule exists', async () => {
        await (0, globals_1.expect)(router.selectModel({
            taskCategory: 'CODING',
            tenantId: 't1',
            riskLevel: 'LOW'
        })).rejects.toThrow();
    });
});
