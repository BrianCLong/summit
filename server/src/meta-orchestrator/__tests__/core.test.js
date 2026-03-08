"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AgentRegistry_js_1 = require("../AgentRegistry.js");
const NegotiationEngine_js_1 = require("../NegotiationEngine.js");
const types_js_1 = require("../types.js");
(0, globals_1.describe)('Meta-Orchestrator Core', () => {
    (0, globals_1.describe)('AgentRegistry', () => {
        let registry;
        (0, globals_1.beforeEach)(() => {
            // Reset singleton for testing (requires access to private static, or just rely on state if we can't reset)
            // Since it's a singleton, we might need to manually clear it if we exposed a clear method,
            // or just use unique IDs for each test.
            registry = AgentRegistry_js_1.AgentRegistry.getInstance();
        });
        (0, globals_1.it)('should register an agent', () => {
            const agent = registry.registerAgent({
                id: 'test-agent-1',
                name: 'Test Agent',
                role: 'Tester',
                capabilities: ['testing'],
                config: {},
                tenantId: 'tenant-1'
            });
            (0, globals_1.expect)(agent.status).toBe(types_js_1.AgentStatus.IDLE);
            (0, globals_1.expect)(registry.getAgent('test-agent-1')).toBeDefined();
        });
        (0, globals_1.it)('should update agent status', () => {
            registry.registerAgent({
                id: 'test-agent-2',
                name: 'Test Agent 2',
                role: 'Tester',
                capabilities: [],
                config: {},
                tenantId: 'tenant-1'
            });
            registry.updateStatus('test-agent-2', types_js_1.AgentStatus.BUSY);
            const agent = registry.getAgent('test-agent-2');
            (0, globals_1.expect)(agent?.status).toBe(types_js_1.AgentStatus.BUSY);
        });
    });
    (0, globals_1.describe)('NegotiationEngine', () => {
        let engine;
        (0, globals_1.beforeEach)(() => {
            engine = new NegotiationEngine_js_1.NegotiationEngine();
        });
        (0, globals_1.it)('should initiate a negotiation', async () => {
            const negotiation = await engine.initiateNegotiation('agent-1', ['agent-2'], 'Resource Allocation', {}, 'tenant-1');
            (0, globals_1.expect)(negotiation.id).toBeDefined();
            (0, globals_1.expect)(negotiation.status).toBe('PENDING');
            (0, globals_1.expect)(negotiation.participantIds).toContain('agent-2');
        });
        (0, globals_1.it)('should accept proposals', async () => {
            const negotiation = await engine.initiateNegotiation('agent-1', ['agent-2'], 'Resource Allocation', {}, 'tenant-1');
            const updated = await engine.submitProposal(negotiation.id, 'agent-1', { resource: 'cpu', amount: 10 });
            (0, globals_1.expect)(updated.rounds.length).toBe(1);
            (0, globals_1.expect)(updated.rounds[0].proposals.length).toBe(1);
            (0, globals_1.expect)(updated.rounds[0].proposals[0].content).toEqual({ resource: 'cpu', amount: 10 });
            (0, globals_1.expect)(updated.status).toBe('IN_PROGRESS');
        });
    });
});
