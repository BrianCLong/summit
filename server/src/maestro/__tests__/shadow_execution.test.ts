import { jest } from '@jest/globals';
import { Maestro } from '../core.js';
import crypto from 'node:crypto';

const shadowMock = jest.fn();
const configMock = jest.fn();

jest.unstable_mockModule('../../services/ShadowService.js', () => ({
    shadowService: {
        shadow: shadowMock,
    },
}));

jest.unstable_mockModule('../../middleware/ShadowTrafficMiddleware.js', () => ({
    getShadowConfig: configMock,
}));

// Mock IntelGraphClient, CostMeter, OpenAILLM
const igMock: any = {
    updateTask: jest.fn().mockResolvedValue({} as any) as any,
    createArtifact: jest.fn().mockResolvedValue({} as any) as any,
};
const costMeterMock: any = {};
const llmMock: any = {
    callCompletion: jest.fn().mockResolvedValue({ content: 'test result' } as any) as any,
};

describe('Maestro Shadow Execution', () => {
    let maestro: Maestro;

    beforeEach(() => {
        jest.clearAllMocks();
        maestro = new Maestro(igMock, costMeterMock, llmMock, {
            defaultPlannerAgent: 'planner',
            defaultActionAgent: 'action'
        });
    });

    it('should trigger shadow mirroring when configured', async () => {
        configMock.mockResolvedValueOnce({
            targetUrl: 'https://shadow.summit.io',
            samplingRate: 1.0,
            compareResponses: false
        } as any);

        const task: any = {
            id: 'task-1',
            runId: 'run-1',
            kind: 'action',
            agent: { id: 'agent-1', kind: 'llm' },
            input: { tenantId: 'tenant-1' },
            description: 'test task',
            updatedAt: new Date().toISOString()
        };

        await maestro.executeTask(task);

        expect(configMock).toHaveBeenCalledWith('tenant-1');
        expect(shadowMock).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'POST',
                url: expect.stringContaining('/api/maestro/tasks/task-1/execute')
            }),
            expect.objectContaining({
                targetUrl: 'https://shadow.summit.io'
            })
        );
    });

    it('should NOT trigger shadow mirroring for shadow requests', async () => {
        const task: any = {
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
