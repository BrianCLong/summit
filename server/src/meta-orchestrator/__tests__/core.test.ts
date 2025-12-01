import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AgentRegistry } from '../AgentRegistry.js';
import { NegotiationEngine } from '../NegotiationEngine.js';
import { AgentStatus } from '../types.js';

describe('Meta-Orchestrator Core', () => {

    describe('AgentRegistry', () => {
        let registry: AgentRegistry;

        beforeEach(() => {
            // Reset singleton for testing (requires access to private static, or just rely on state if we can't reset)
            // Since it's a singleton, we might need to manually clear it if we exposed a clear method,
            // or just use unique IDs for each test.
            registry = AgentRegistry.getInstance();
        });

        it('should register an agent', () => {
            const agent = registry.registerAgent({
                id: 'test-agent-1',
                name: 'Test Agent',
                role: 'Tester',
                capabilities: ['testing'],
                config: {},
                tenantId: 'tenant-1'
            });

            expect(agent.status).toBe(AgentStatus.IDLE);
            expect(registry.getAgent('test-agent-1')).toBeDefined();
        });

        it('should update agent status', () => {
            registry.registerAgent({
                id: 'test-agent-2',
                name: 'Test Agent 2',
                role: 'Tester',
                capabilities: [],
                config: {},
                tenantId: 'tenant-1'
            });

            registry.updateStatus('test-agent-2', AgentStatus.BUSY);
            const agent = registry.getAgent('test-agent-2');
            expect(agent?.status).toBe(AgentStatus.BUSY);
        });
    });

    describe('NegotiationEngine', () => {
        let engine: NegotiationEngine;

        beforeEach(() => {
            engine = new NegotiationEngine();
        });

        it('should initiate a negotiation', async () => {
            const negotiation = await engine.initiateNegotiation(
                'agent-1',
                ['agent-2'],
                'Resource Allocation',
                {},
                'tenant-1'
            );

            expect(negotiation.id).toBeDefined();
            expect(negotiation.status).toBe('PENDING');
            expect(negotiation.participantIds).toContain('agent-2');
        });

        it('should accept proposals', async () => {
             const negotiation = await engine.initiateNegotiation(
                'agent-1',
                ['agent-2'],
                'Resource Allocation',
                {},
                'tenant-1'
            );

            const updated = await engine.submitProposal(negotiation.id, 'agent-1', { resource: 'cpu', amount: 10 });

            expect(updated.rounds.length).toBe(1);
            expect(updated.rounds[0].proposals.length).toBe(1);
            expect(updated.rounds[0].proposals[0].content).toEqual({ resource: 'cpu', amount: 10 });
            expect(updated.status).toBe('IN_PROGRESS');
        });
    });
});
