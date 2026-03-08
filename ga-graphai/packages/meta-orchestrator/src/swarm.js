"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmOrchestrator = exports.ConsensusProtocol = exports.TaskDecomposer = exports.AgentMarketplace = void 0;
exports.buildDefaultSwarm = buildDefaultSwarm;
const node_crypto_1 = require("node:crypto");
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function mean(values) {
    if (values.length === 0) {
        return 0;
    }
    return values.reduce((acc, value) => acc + value, 0) / values.length;
}
class AgentMarketplace {
    agents = new Map();
    constructor(initialAgents = []) {
        initialAgents.forEach((agent) => this.register(agent));
    }
    register(agent) {
        if (agent.reliability < 0 || agent.reliability > 1) {
            throw new Error('reliability must be between 0 and 1');
        }
        if (agent.reputation < 0 || agent.reputation > 1) {
            throw new Error('reputation must be between 0 and 1');
        }
        this.agents.set(agent.id, { ...agent, maxConcurrency: agent.maxConcurrency ?? 2 });
    }
    list() {
        return Array.from(this.agents.values());
    }
    updateReputation(agentId, delta) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }
        const updated = { ...agent, reputation: clamp(agent.reputation + delta, 0, 1) };
        this.agents.set(agentId, updated);
        return updated;
    }
    placeBids(task) {
        const candidates = this.list().filter((agent) => task.requiredCapabilities.every((capability) => agent.capabilities.includes(capability)));
        return candidates.map((agent) => {
            const capabilityBonus = task.requiredCapabilities.length / (agent.capabilities.length || 1);
            const price = agent.costPerTask * capabilityBonus;
            const estimatedDurationMinutes = Math.max(1, Math.ceil(60 / Math.max(agent.throughput, 1)));
            const confidence = clamp(agent.reliability * 0.5 + agent.reputation * 0.5, 0, 1);
            const priorityBoost = 1 + task.priority * 0.05;
            const score = confidence * priorityBoost - price * 0.01;
            return { taskId: task.id, agentId: agent.id, price, estimatedDurationMinutes, confidence, score };
        });
    }
}
exports.AgentMarketplace = AgentMarketplace;
class TaskDecomposer {
    static decompose(task) {
        if (task.requiredCapabilities.length === 0) {
            return { ...task, children: [] };
        }
        const children = task.requiredCapabilities.map((capability, index) => ({
            id: `${task.id}:child:${index + 1}`,
            goal: `${task.goal} :: ${capability}`,
            requiredCapabilities: [capability],
            priority: task.priority,
            budget: task.budget / task.requiredCapabilities.length,
            parentId: task.id,
            children: [],
            metadata: { ...task.metadata, capability },
        }));
        return { ...task, children };
    }
}
exports.TaskDecomposer = TaskDecomposer;
class ConsensusProtocol {
    reputations;
    constructor(reputations) {
        this.reputations = reputations;
    }
    aggregate(candidates) {
        if (candidates.length === 0) {
            return { winner: null, agreement: 0, supportingAgents: [] };
        }
        const rep = this.reputations();
        const scored = candidates.map((candidate) => {
            const reputationWeight = rep.get(candidate.agentId) ?? 0.5;
            const vote = clamp(candidate.confidence * 0.6 + reputationWeight * 0.4, 0, 1);
            return { candidate, vote };
        });
        const maxVote = Math.max(...scored.map((entry) => entry.vote));
        const top = scored.filter((entry) => entry.vote === maxVote).map((entry) => entry.candidate);
        const winner = top[0];
        const agreement = mean(scored.map((entry) => entry.vote));
        return {
            winner: winner ?? null,
            agreement,
            supportingAgents: top.map((candidate) => candidate.agentId),
        };
    }
}
exports.ConsensusProtocol = ConsensusProtocol;
class SwarmOrchestrator {
    marketplace;
    maxParallel;
    onMessage;
    activeAssignments = new Map();
    transcript = [];
    constructor(options) {
        this.marketplace = options.marketplace;
        this.maxParallel = options.maxParallel ?? 10;
        this.onMessage = options.onMessage;
    }
    get messages() {
        return [...this.transcript];
    }
    publish(message) {
        const entry = {
            ...message,
            id: (0, node_crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
        };
        this.transcript.push(entry);
        this.onMessage?.(entry);
    }
    sortedBids(task) {
        const bids = this.marketplace.placeBids(task);
        return bids
            .filter((bid) => bid.price <= task.budget)
            .sort((a, b) => b.score - a.score);
    }
    nextAgent(task) {
        const bids = this.sortedBids(task);
        const scored = bids.map((bid) => {
            const active = this.activeAssignments.get(bid.agentId) ?? 0;
            const agent = this.marketplace.list().find((candidate) => candidate.id === bid.agentId);
            const maxConcurrency = agent?.maxConcurrency ?? 1;
            const load = active / maxConcurrency;
            const loadPenalty = clamp(1 - load, 0, 1);
            return { bid, composite: bid.score * 0.7 + loadPenalty * 0.3 };
        });
        return scored.sort((a, b) => b.composite - a.composite)[0]?.bid.agentId;
    }
    async executeTasks(rootTasks, executor) {
        const tasks = rootTasks.flatMap((task) => {
            const decomposed = TaskDecomposer.decompose(task);
            return [decomposed, ...(decomposed.children ?? [])];
        });
        const consensus = new ConsensusProtocol(() => new Map(this.marketplace.list().map((agent) => [agent.id, agent.reputation])));
        const start = performance.now();
        const outcomes = [];
        const running = new Set();
        for (const task of tasks) {
            if (running.size >= this.maxParallel) {
                await Promise.race(running);
            }
            const promise = this.runTask(task, executor, consensus)
                .then((outcome) => {
                outcomes.push(outcome);
            })
                .finally(() => {
                running.delete(promise);
            });
            running.add(promise);
        }
        await Promise.all(running);
        const completed = outcomes.filter((outcome) => outcome.status === 'success');
        const failed = outcomes.filter((outcome) => outcome.status === 'failed');
        const telemetry = {
            completed: completed.length,
            failed: failed.length,
            averageCost: mean(outcomes.map((outcome) => outcome.cost)),
            averageConfidence: mean(completed.map((outcome) => outcome.confidence ?? 0.5)),
            wallClockMs: performance.now() - start,
            consensusAgreement: mean(completed.map((outcome) => outcome.consensus?.agreement ?? 0)),
        };
        return { outcomes, telemetry };
    }
    async runTask(task, executor, consensus) {
        const assignedAgent = this.nextAgent(task);
        if (!assignedAgent) {
            return {
                taskId: task.id,
                agentId: 'unassigned',
                status: 'failed',
                cost: 0,
                retries: 0,
                fallbackChain: [],
            };
        }
        const fallbackChain = [];
        let selectedAgent = assignedAgent;
        let attempts = 0;
        const candidates = [];
        while (attempts <= 3) {
            attempts += 1;
            this.activeAssignments.set(selectedAgent, (this.activeAssignments.get(selectedAgent) ?? 0) + 1);
            this.publish({
                from: 'orchestrator',
                to: selectedAgent,
                taskId: task.id,
                content: `Dispatching task ${task.id} attempt ${attempts}`,
            });
            try {
                const result = await executor(task, selectedAgent);
                if (result.status === 'success') {
                    this.marketplace.updateReputation(selectedAgent, 0.05);
                    if (fallbackChain.length > 0) {
                        this.publish({
                            from: selectedAgent,
                            taskId: task.id,
                            content: `Recovered after fallback from ${fallbackChain.join(' -> ')}`,
                        });
                    }
                    candidates.push({
                        agentId: selectedAgent,
                        taskId: task.id,
                        result: result.result,
                        cost: result.cost,
                        confidence: result.confidence ?? 0.7,
                    });
                    const consensusResult = consensus.aggregate(candidates);
                    return {
                        taskId: task.id,
                        agentId: selectedAgent,
                        status: 'success',
                        cost: result.cost,
                        confidence: result.confidence ?? 0.7,
                        consensus: consensusResult,
                        result: result.result,
                        retries: attempts - 1,
                        fallbackChain,
                    };
                }
                this.marketplace.updateReputation(selectedAgent, -0.1);
            }
            catch (error) {
                this.marketplace.updateReputation(selectedAgent, -0.1);
                this.publish({
                    from: selectedAgent,
                    taskId: task.id,
                    content: `Failure: ${error.message}`,
                });
            }
            finally {
                this.activeAssignments.set(selectedAgent, Math.max((this.activeAssignments.get(selectedAgent) ?? 1) - 1, 0));
            }
            const next = this.sortedBids(task).find((bid) => !fallbackChain.includes(bid.agentId))?.agentId;
            if (!next || next === selectedAgent) {
                break;
            }
            fallbackChain.push(selectedAgent);
            selectedAgent = next;
            this.publish({
                from: 'orchestrator',
                to: selectedAgent,
                taskId: task.id,
                content: `Attempting fallback with ${selectedAgent}`,
            });
        }
        return {
            taskId: task.id,
            agentId: selectedAgent,
            status: 'failed',
            cost: 0,
            retries: attempts - 1,
            fallbackChain,
        };
    }
}
exports.SwarmOrchestrator = SwarmOrchestrator;
function buildDefaultSwarm(goal) {
    const marketplace = new AgentMarketplace([
        { id: 'analyst', capabilities: ['analysis', 'summarization'], costPerTask: 1, reliability: 0.8, throughput: 30, reputation: 0.7 },
        { id: 'executor', capabilities: ['action', 'retrieval'], costPerTask: 1.2, reliability: 0.75, throughput: 25, reputation: 0.65 },
        { id: 'validator', capabilities: ['validation', 'analysis'], costPerTask: 0.9, reliability: 0.82, throughput: 28, reputation: 0.72 },
    ]);
    const orchestrator = new SwarmOrchestrator({ marketplace });
    const task = {
        id: `task-${goal}`,
        goal,
        requiredCapabilities: ['analysis', 'action', 'validation'],
        priority: 5,
        budget: 10,
    };
    return { marketplace, orchestrator, task };
}
