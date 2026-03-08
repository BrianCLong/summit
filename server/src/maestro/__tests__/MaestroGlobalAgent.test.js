"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GlobalTrafficSteering_js_1 = require("../../runtime/global/GlobalTrafficSteering.js");
const MaestroGlobalAgent_js_1 = require("../agents/MaestroGlobalAgent.js");
describe('MaestroGlobalAgent', () => {
    let agent;
    let steeringSpy;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        agent = MaestroGlobalAgent_js_1.MaestroGlobalAgent.getInstance();
        steeringSpy = globals_1.jest.spyOn(GlobalTrafficSteering_js_1.globalTrafficSteering, 'resolveRegion');
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
        const result = await agent.evaluateRouting({ id: 'task-1', input: { tenantId: 't1' } });
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('Routing is optimal');
    });
    it('should advise redirection if routing is suboptimal', async () => {
        steeringSpy.mockResolvedValue({
            targetRegion: 'eu-central-1',
            isOptimal: false,
            reason: 'Routing to tenant primary region: eu-central-1 (Current: us-east-1)'
        });
        const result = await agent.evaluateRouting({ id: 'task-2', input: { tenantId: 't2' } });
        expect(result.allowed).toBe(false);
        expect(result.advice).toBe('eu-central-1');
        expect(result.reason).toContain('Routing to tenant primary region');
    });
    it('should allow execution for system tasks (no tenantId)', async () => {
        const result = await agent.evaluateRouting({ id: 'task-3', input: {} });
        expect(result.allowed).toBe(true);
        expect(result.reason).toContain('System operation');
    });
});
