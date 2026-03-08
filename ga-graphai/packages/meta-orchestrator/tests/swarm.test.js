"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const swarm_js_1 = require("../src/swarm.js");
const baseAgents = [
    {
        id: 'alpha',
        capabilities: ['analysis', 'action'],
        costPerTask: 1.5,
        reliability: 0.85,
        throughput: 30,
        reputation: 0.6,
    },
    {
        id: 'beta',
        capabilities: ['analysis', 'validation'],
        costPerTask: 1.1,
        reliability: 0.78,
        throughput: 26,
        reputation: 0.72,
    },
];
(0, vitest_1.describe)('TaskDecomposer', () => {
    (0, vitest_1.it)('splits tasks into capability-driven children', () => {
        const task = {
            id: 'parent',
            goal: 'achieve mission',
            requiredCapabilities: ['analysis', 'action', 'validation'],
            priority: 4,
            budget: 12,
        };
        const decomposed = swarm_js_1.TaskDecomposer.decompose(task);
        (0, vitest_1.expect)(decomposed.children?.length).toBe(3);
        (0, vitest_1.expect)(decomposed.children?.map((child) => child.parentId)).toEqual([
            'parent',
            'parent',
            'parent',
        ]);
        (0, vitest_1.expect)(decomposed.children?.map((child) => child.requiredCapabilities[0])).toEqual(['analysis', 'action', 'validation']);
    });
    (0, vitest_1.it)('returns task unchanged when no capabilities', () => {
        const task = {
            id: 'solo',
            goal: 'solo task',
            requiredCapabilities: [],
            priority: 1,
            budget: 1,
        };
        const decomposed = swarm_js_1.TaskDecomposer.decompose(task);
        (0, vitest_1.expect)(decomposed.children).toEqual([]);
    });
});
(0, vitest_1.describe)('AgentMarketplace', () => {
    (0, vitest_1.it)('scores bids and updates reputation bounds', () => {
        const marketplace = new swarm_js_1.AgentMarketplace(baseAgents);
        const task = {
            id: 't1',
            goal: 'analyze',
            requiredCapabilities: ['analysis'],
            priority: 5,
            budget: 5,
        };
        const bids = marketplace.placeBids(task);
        (0, vitest_1.expect)(bids[0].price).toBeGreaterThan(0);
        const updated = marketplace.updateReputation('alpha', 0.5);
        (0, vitest_1.expect)(updated.reputation).toBeLessThanOrEqual(1);
        const reduced = marketplace.updateReputation('alpha', -2);
        (0, vitest_1.expect)(reduced.reputation).toBeGreaterThanOrEqual(0);
    });
});
(0, vitest_1.describe)('SwarmOrchestrator', () => {
    (0, vitest_1.it)('recovers with fallback agents and records communication', async () => {
        const marketplace = new swarm_js_1.AgentMarketplace([
            {
                id: 'primary',
                capabilities: ['analysis'],
                costPerTask: 1,
                reliability: 0.9,
                throughput: 20,
                reputation: 0.8,
            },
            {
                id: 'secondary',
                capabilities: ['analysis'],
                costPerTask: 1.2,
                reliability: 0.85,
                throughput: 18,
                reputation: 0.7,
            },
        ]);
        const orchestrator = new swarm_js_1.SwarmOrchestrator({ marketplace, maxParallel: 2 });
        const task = {
            id: 'critical',
            goal: 'assess',
            requiredCapabilities: ['analysis'],
            priority: 5,
            budget: 6,
        };
        let firstAttempt = true;
        const executor = async (_task, agentId) => {
            if (_task.parentId === undefined && agentId === 'primary' && firstAttempt) {
                firstAttempt = false;
                throw new Error('simulated failure');
            }
            return {
                status: 'success',
                cost: 1.5,
                result: { agentId },
                confidence: 0.9,
            };
        };
        const { outcomes } = await orchestrator.executeTasks([task], executor);
        const parentOutcome = outcomes.find((outcome) => outcome.taskId === 'critical');
        (0, vitest_1.expect)(parentOutcome?.agentId).toBe('secondary');
        (0, vitest_1.expect)(parentOutcome?.status).toBe('success');
        (0, vitest_1.expect)(parentOutcome?.fallbackChain).toContain('primary');
        (0, vitest_1.expect)(parentOutcome?.consensus?.winner?.agentId).toBe('secondary');
        (0, vitest_1.expect)(parentOutcome?.confidence).toBeCloseTo(0.9);
        (0, vitest_1.expect)(orchestrator.messages.some((message) => message.content.includes('Attempting fallback'))).toBe(true);
    });
    (0, vitest_1.it)('clears active assignments after failure paths', async () => {
        const marketplace = new swarm_js_1.AgentMarketplace([
            {
                id: 'single',
                capabilities: ['analysis'],
                costPerTask: 1,
                reliability: 0.5,
                throughput: 10,
                reputation: 0.5,
            },
        ]);
        const orchestrator = new swarm_js_1.SwarmOrchestrator({ marketplace, maxParallel: 1 });
        const task = {
            id: 'failing',
            goal: 'fail',
            requiredCapabilities: ['analysis'],
            priority: 1,
            budget: 2,
        };
        const executor = async () => {
            throw new Error('hard failure');
        };
        const { outcomes } = await orchestrator.executeTasks([task], executor);
        (0, vitest_1.expect)(outcomes[0].status).toBe('failed');
        const activeAssignments = orchestrator.activeAssignments;
        (0, vitest_1.expect)(activeAssignments.get('single')).toBe(0);
    });
    (0, vitest_1.it)('respects maxParallel by bounding concurrent executor calls', async () => {
        const marketplace = new swarm_js_1.AgentMarketplace([
            {
                id: 'c1',
                capabilities: ['general'],
                costPerTask: 1,
                reliability: 0.8,
                throughput: 10,
                reputation: 0.6,
            },
        ]);
        const orchestrator = new swarm_js_1.SwarmOrchestrator({ marketplace, maxParallel: 1 });
        const tasks = Array.from({ length: 3 }).map((_, index) => ({
            id: `t-${index + 1}`,
            goal: 'bounded concurrency',
            requiredCapabilities: [],
            priority: 1,
            budget: 1,
        }));
        let inFlight = 0;
        let maxObserved = 0;
        const executor = async () => {
            inFlight += 1;
            maxObserved = Math.max(maxObserved, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 10));
            inFlight -= 1;
            return { status: 'success', cost: 0.1 };
        };
        await orchestrator.executeTasks(tasks, executor);
        (0, vitest_1.expect)(maxObserved).toBeLessThanOrEqual(1);
    });
});
(0, vitest_1.describe)('ConsensusProtocol', () => {
    (0, vitest_1.it)('favors higher confidence weighted by reputation', () => {
        const marketplace = new swarm_js_1.AgentMarketplace(baseAgents);
        const protocol = new swarm_js_1.ConsensusProtocol(() => new Map(marketplace
            .list()
            .map((agent) => [agent.id, agent.reputation])));
        const result = protocol.aggregate([
            {
                agentId: 'alpha',
                taskId: 'x',
                result: { value: 'a' },
                cost: 1,
                confidence: 0.6,
            },
            {
                agentId: 'beta',
                taskId: 'x',
                result: { value: 'b' },
                cost: 1,
                confidence: 0.9,
            },
        ]);
        (0, vitest_1.expect)(result.winner?.agentId).toBe('beta');
        (0, vitest_1.expect)(result.agreement).toBeGreaterThan(0);
    });
});
