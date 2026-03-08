"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const core_js_1 = require("../core.js");
const shadowMock = globals_1.jest.fn();
const configMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../services/ShadowService.js', () => ({
    shadowService: {
        shadow: shadowMock,
    },
}));
globals_1.jest.unstable_mockModule('../../middleware/ShadowTrafficMiddleware.js', () => ({
    getShadowConfig: configMock,
}));
// Mock IntelGraphClient, CostMeter, OpenAILLM
const igMock = {
    updateTask: globals_1.jest.fn().mockResolvedValue({}),
    createArtifact: globals_1.jest.fn().mockResolvedValue({}),
};
const costMeterMock = {};
const llmMock = {
    callCompletion: globals_1.jest.fn().mockResolvedValue({ content: 'test result' }),
};
describe('Maestro Shadow Execution', () => {
    let maestro;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        maestro = new core_js_1.Maestro(igMock, costMeterMock, llmMock, {
            defaultPlannerAgent: 'planner',
            defaultActionAgent: 'action'
        });
    });
    it('should execute primary task path without invoking shadow mirroring hooks', async () => {
        configMock.mockResolvedValueOnce({
            targetUrl: 'https://shadow.summit.io',
            samplingRate: 1.0,
            compareResponses: false
        });
        const task = {
            id: 'task-1',
            runId: 'run-1',
            kind: 'action',
            agent: { id: 'agent-1', kind: 'llm' },
            input: { tenantId: 'tenant-1' },
            description: 'test task',
            updatedAt: new Date().toISOString()
        };
        await maestro.executeTask(task);
        expect(configMock).not.toHaveBeenCalled();
        expect(shadowMock).not.toHaveBeenCalled();
    });
    it('should NOT trigger shadow mirroring for shadow requests', async () => {
        const task = {
            id: 'task-shadow',
            runId: 'run-1',
            kind: 'action',
            agent: { id: 'agent-1', kind: 'llm' },
            input: { tenantId: 'tenant-1', _isShadow: true },
            description: 'test shadow task',
            updatedAt: new Date().toISOString()
        };
        await maestro.executeTask(task);
        expect(configMock).not.toHaveBeenCalled();
        expect(shadowMock).not.toHaveBeenCalled();
    });
});
