import { jest } from '@jest/globals';
import { globalTrafficSteering } from '../../runtime/global/GlobalTrafficSteering.js';
import { MaestroGlobalAgent } from '../agents/MaestroGlobalAgent.js';

describe('MaestroGlobalAgent', () => {
    let agent: MaestroGlobalAgent;
    let steeringSpy: jest.SpiedFunction<typeof globalTrafficSteering.resolveRegion>;

    beforeEach(() => {
        jest.clearAllMocks();
        agent = MaestroGlobalAgent.getInstance();
        steeringSpy = jest.spyOn(globalTrafficSteering, 'resolveRegion');
    });

    afterEach(() => {
        steeringSpy.mockRestore();
    });

    it('should allow execution if routing is optimal', async () => {
        steeringSpy.mockResolvedValue({
            targetRegion: 'us-east-1',
            isOptimal: true,
            reason: 'Optimal'
        });

        const result = await agent.evaluateRouting({ id: 'task-1', input: { tenantId: 't1' } } as any);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('Routing is optimal');
    });

    it('should advise redirection if routing is suboptimal', async () => {
        steeringSpy.mockResolvedValue({
            targetRegion: 'eu-central-1',
            isOptimal: false,
            reason: 'Routing to tenant primary region: eu-central-1 (Current: us-east-1)'
        });

        const result = await agent.evaluateRouting({ id: 'task-2', input: { tenantId: 't2' } } as any);
        expect(result.allowed).toBe(false);
        expect(result.advice).toBe('eu-central-1');
        expect(result.reason).toContain('Routing to tenant primary region');
    });

    it('should allow execution for system tasks (no tenantId)', async () => {
        const result = await agent.evaluateRouting({ id: 'task-3', input: {} } as any);
        expect(result.allowed).toBe(true);
        expect(result.reason).toContain('System operation');
    });
});
