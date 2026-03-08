"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maestroService = exports.MaestroService = void 0;
const runs_repo_js_1 = require("./runs/runs-repo.js");
const subagent_coordinator_js_1 = require("./subagent-coordinator.js");
const KillSwitchService_js_1 = require("../services/KillSwitchService.js");
const TelemetryService_js_1 = require("../services/TelemetryService.js");
const DriftDetectionService_js_1 = require("../services/DriftDetectionService.js");
const orchestrator_store_js_1 = require("./store/orchestrator-store.js");
class MaestroService {
    static instance;
    orchestratorStore;
    subagentCoordinator;
    constructor(dbPool) {
        this.subagentCoordinator = subagent_coordinator_js_1.SubagentCoordinator.getInstance();
        // Initialize with PostgreSQL store if pool is provided, otherwise use in-memory
        this.orchestratorStore = dbPool ? new orchestrator_store_js_1.OrchestratorPostgresStore(dbPool) : this.createInMemoryStore();
        DriftDetectionService_js_1.driftDetectionService.startMonitoring();
    }
    static getInstance(dbPool) {
        if (!MaestroService.instance) {
            MaestroService.instance = new MaestroService(dbPool);
        }
        return MaestroService.instance;
    }
    createInMemoryStore() {
        // Return a simplified in-memory implementation for backward compatibility
        const inMemoryData = {
            loops: [
                {
                    id: 'cost-optimization',
                    name: 'Cost Optimization Loop',
                    type: 'cost',
                    status: 'active',
                    lastDecision: 'Shifted 20% traffic to Haiku for non-critical tasks',
                    lastRun: new Date().toISOString(),
                    config: { threshold: 0.8, interval: '15m' },
                },
                {
                    id: 'reliability-guardian',
                    name: 'Reliability Guardian',
                    type: 'reliability',
                    status: 'active',
                    lastDecision: 'Quarantined node agent-worker-3 due to high error rate',
                    lastRun: new Date().toISOString(),
                    config: { maxRetries: 3 },
                },
                {
                    id: 'safety-sentinel',
                    name: 'Safety Sentinel',
                    type: 'safety',
                    status: 'active',
                    lastDecision: 'Blocked 2 prompts for PII violation',
                    lastRun: new Date().toISOString(),
                    config: { strictMode: true },
                },
            ],
            experiments: [
                {
                    id: 'exp-001',
                    name: 'Planner Agent V2',
                    hypothesis: 'New prompt structure reduces planning latency by 15%',
                    status: 'running',
                    variants: ['control', 'v2-prompt'],
                    metrics: { latency: -12, successRate: +2 },
                    startDate: new Date(Date.now() - 86400000 * 2).toISOString(),
                },
            ],
            playbooks: [
                {
                    id: 'pb-restart-pods',
                    name: 'Restart Stuck Pods',
                    description: 'Automatically restarts pods that are in CrashLoopBackOff for > 10m',
                    triggers: ['pod_crash_loop'],
                    actions: ['k8s.delete_pod'],
                    isEnabled: true,
                },
            ],
            auditLog: [],
            agents: [
                {
                    id: 'planner',
                    name: 'Planner',
                    role: 'Orchestration',
                    model: 'gpt-4-turbo',
                    status: 'healthy',
                    metrics: { successRate: 98.5, latencyP95: 1200, costPerTask: 0.03 },
                    routingWeight: 100,
                },
                {
                    id: 'coder',
                    name: 'Coder',
                    role: 'Implementation',
                    model: 'claude-3-opus',
                    status: 'healthy',
                    metrics: { successRate: 95.2, latencyP95: 4500, costPerTask: 0.15 },
                    routingWeight: 80,
                },
                {
                    id: 'reviewer',
                    name: 'Reviewer',
                    role: 'Quality Assurance',
                    model: 'gpt-4o',
                    status: 'healthy',
                    metrics: { successRate: 99.1, latencyP95: 2100, costPerTask: 0.05 },
                    routingWeight: 100,
                },
            ],
        };
        return {
            initialize: async () => Promise.resolve(),
            getLoops: async () => inMemoryData.loops,
            getLoopById: async (id) => inMemoryData.loops.find(loop => loop.id === id) || null,
            updateLoopStatus: async (id, status) => {
                const loop = inMemoryData.loops.find(l => l.id === id);
                if (loop) {
                    loop.status = status;
                    return true;
                }
                return false;
            },
            getAgents: async () => {
                // Convert AgentProfile to MaestroAgent format
                return inMemoryData.agents.map(agent => ({
                    id: agent.id,
                    name: agent.name,
                    role: agent.role,
                    model: agent.model,
                    status: agent.status,
                    routingWeight: agent.routingWeight,
                    metrics: agent.metrics,
                }));
            },
            getAgentById: async (id) => {
                const agent = inMemoryData.agents.find(a => a.id === id);
                if (agent) {
                    return {
                        id: agent.id,
                        name: agent.name,
                        role: agent.role,
                        model: agent.model,
                        status: agent.status,
                        routingWeight: agent.routingWeight,
                        metrics: agent.metrics,
                    };
                }
                return null;
            },
            updateAgent: async (id, updates, actor) => {
                const idx = inMemoryData.agents.findIndex(a => a.id === id);
                if (idx !== -1) {
                    inMemoryData.agents[idx] = { ...inMemoryData.agents[idx], ...updates };
                    await this.logAudit(actor, 'update_agent', id, `Updated agent ${id}`);
                    return {
                        id: inMemoryData.agents[idx].id,
                        name: inMemoryData.agents[idx].name,
                        role: inMemoryData.agents[idx].role,
                        model: inMemoryData.agents[idx].model,
                        status: inMemoryData.agents[idx].status,
                        routingWeight: inMemoryData.agents[idx].routingWeight,
                        metrics: inMemoryData.agents[idx].metrics,
                    };
                }
                return null;
            },
            getExperiments: async () => inMemoryData.experiments,
            createExperiment: async (experiment, actor) => {
                inMemoryData.experiments.push(experiment);
                await this.logAudit(actor, 'create_experiment', experiment.id, `Created experiment ${experiment.name}`);
                return experiment;
            },
            getPlaybooks: async () => inMemoryData.playbooks,
            createCoordinationTask: async (task, actor) => {
                const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const coordinationTask = {
                    id,
                    title: task.title,
                    description: task.description,
                    status: 'pending',
                    ownerId: task.ownerId,
                    participants: task.participants,
                    priority: task.priority,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await this.logAudit(actor, 'create_coordination_task', `coordination_task:${id}`, `Created coordination task ${task.title}`);
                return coordinationTask;
            },
            getCoordinationTaskById: async (id) => null, // Implement as needed
            updateCoordinationTaskStatus: async (id, status) => false, // Implement as needed
            createCoordinationChannel: async (topic, participantAgentIds, actor) => {
                const id = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const channel = {
                    id,
                    topic,
                    participants: participantAgentIds,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await this.logAudit(actor, 'create_coordination_channel', `coordination_channel:${id}`, `Created coordination channel for topic: ${topic}`);
                return channel;
            },
            getCoordinationChannelById: async (id) => null, // Implement as needed
            initiateConsensus: async (coordinatorId, topic, proposal, voterAgentIds, deadlineHours, actor) => {
                const id = `consensus_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);
                const consensusProposal = {
                    id,
                    topic,
                    proposal,
                    coordinatorId,
                    voters: voterAgentIds,
                    votes: {},
                    status: 'voting',
                    deadline: deadline.toISOString(),
                    createdAt: new Date().toISOString(),
                };
                await this.logAudit(actor, 'initiate_consensus', `consensus_proposal:${id}`, `Initiated consensus for topic: ${topic}`);
                return consensusProposal;
            },
            getConsensusProposalById: async (id) => null, // Implement as needed
            recordVote: async (proposalId, agentId, vote) => false, // Implement as needed
            getAuditLog: async (limit = 100) => inMemoryData.auditLog.slice(0, limit),
            logAudit: async (actor, action, resource, details, status = 'allowed') => {
                inMemoryData.auditLog.unshift({
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    actor,
                    action,
                    resource,
                    details,
                    status,
                });
                // Keep log size manageable
                if (inMemoryData.auditLog.length > 1000)
                    inMemoryData.auditLog = inMemoryData.auditLog.slice(0, 1000);
            },
        };
    }
    async initialize() {
        await this.orchestratorStore.initialize();
    }
    // --- Dashboard ---
    async getHealthSnapshot(tenantId) {
        const runs = await runs_repo_js_1.runsRepo.list(tenantId, 100);
        const recentFailures = runs.filter((r) => r.status === 'failed' && new Date(r.created_at).getTime() > Date.now() - 3600000).length;
        let overallScore = 100;
        if (recentFailures > 5)
            overallScore -= 20;
        if (recentFailures > 15)
            overallScore -= 40;
        return {
            overallScore: Math.max(0, overallScore),
            workstreams: [
                { name: 'MC-Core', status: overallScore > 80 ? 'healthy' : 'degraded', score: overallScore },
                { name: 'MergeTrain', status: 'healthy', score: 98 },
                { name: 'IntelGraph-Ingest', status: 'healthy', score: 95 },
                { name: 'UI/UX', status: 'healthy', score: 100 },
            ],
            activeAlerts: overallScore < 90
                ? [
                    {
                        id: 'alert-1',
                        title: 'High failure rate in last hour',
                        severity: 'warning',
                        timestamp: new Date().toISOString(),
                    },
                ]
                : [],
        };
    }
    async getDashboardStats(tenantId) {
        const runs = await runs_repo_js_1.runsRepo.list(tenantId, 1000);
        const activeRuns = runs.filter((r) => r.status === 'running').length;
        const completedRuns = runs.filter((r) => r.status === 'succeeded').length;
        const failedRuns = runs.filter((r) => r.status === 'failed').length;
        return {
            activeRuns,
            completedRuns,
            failedRuns,
            totalRuns: runs.length,
            tasksPerMinute: 42, // Mock for now, would need task table
            successRate: runs.length ? (completedRuns / runs.length) * 100 : 100,
        };
    }
    // --- Runs ---
    // Proxied to runsRepo
    // --- Agents ---
    async getAgents() {
        return await this.orchestratorStore.getAgents();
    }
    async updateAgent(id, updates, actor) {
        return await this.orchestratorStore.updateAgent(id, updates, actor);
    }
    // --- Autonomic ---
    async getControlLoops() {
        return await this.orchestratorStore.getLoops();
    }
    async toggleLoop(id, status, actor) {
        return await this.orchestratorStore.updateLoopStatus(id, status);
    }
    // --- Experiments & Playbooks ---
    async getExperiments() {
        return await this.orchestratorStore.getExperiments();
    }
    async createExperiment(experiment, actor) {
        return await this.orchestratorStore.createExperiment(experiment, actor);
    }
    async getPlaybooks() {
        return await this.orchestratorStore.getPlaybooks();
    }
    // --- Audit ---
    async getAuditLog(limit = 100) {
        return await this.orchestratorStore.getAuditLog(limit);
    }
    async logAudit(actor, action, resource, details, status = 'allowed') {
        await this.orchestratorStore.logAudit(actor, action, resource, details, status);
    }
    // --- Subagent Coordination Methods ---
    /**
     * Coordinate tasks between multiple agents
     */
    async coordinateAgents(task, participantAgentIds, actor) {
        // 1. Kill Switch Check
        const healthCheck = KillSwitchService_js_1.killSwitchService.checkSystemHealth({ agentId: actor, feature: 'agent_coordination' });
        if (!healthCheck.allowed) {
            throw new Error(`System Kill Switch Active: ${healthCheck.reason}`);
        }
        // 2. First, check governance compliance
        const governanceCheck = await subagent_coordinator_js_1.agentGovernance.evaluateAction({
            id: actor,
            name: 'MaestroService',
            tenantId: 'system',
            capabilities: ['coordination', 'orchestration'],
            metadata: {},
            status: 'active',
            health: { cpuUsage: 0, memoryUsage: 0, lastHeartbeat: new Date(), activeTasks: 0, errorRate: 0 }
        }, 'coordinate_agents', { task, participants: participantAgentIds });
        // Telemetry for Policy Decision
        TelemetryService_js_1.telemetryService.logEvent('policy_decision', {
            id: `pol-${Date.now()}`,
            policyId: 'agent_governance',
            decision: governanceCheck.allowed ? 'allow' : 'deny',
            reason: governanceCheck.reason,
            actorId: actor,
            resourceId: 'coordinate_agents',
            timestamp: new Date(),
            context: { task, participants: participantAgentIds }
        });
        if (!governanceCheck.allowed) {
            throw new Error(`Agent coordination prohibited: ${governanceCheck.reason}`);
        }
        // Create coordination task in store
        const coordinationTask = await this.orchestratorStore.createCoordinationTask(task, actor);
        await this.logAudit(actor, 'coordinate_agents', `coordination_task:${coordinationTask.id}`, `Coordinated task ${task.title} among ${participantAgentIds.length} agents`);
        // Telemetry for Agent Action
        const duration = Date.now() - (task.createdAt ? new Date(task.createdAt).getTime() : Date.now());
        TelemetryService_js_1.telemetryService.logEvent('agent_action', {
            id: `act-${Date.now()}`,
            agentId: actor,
            actionType: 'coordinate_agents',
            status: 'success',
            durationMs: duration > 0 ? duration : 0,
            timestamp: new Date(),
            metadata: { taskId: coordinationTask.id }
        });
        return coordinationTask;
    }
    /**
     * Create a coordination channel for multi-agent collaboration
     */
    async createCoordinationChannel(topic, participantAgentIds, actor) {
        // 1. Kill Switch Check
        const healthCheck = KillSwitchService_js_1.killSwitchService.checkSystemHealth({ agentId: actor, feature: 'coordination_channel' });
        if (!healthCheck.allowed) {
            throw new Error(`System Kill Switch Active: ${healthCheck.reason}`);
        }
        // Check governance compliance
        const governanceCheck = await subagent_coordinator_js_1.agentGovernance.evaluateAction({
            id: actor,
            name: 'MaestroService',
            tenantId: 'system',
            capabilities: ['coordination', 'orchestration'],
            metadata: {},
            status: 'active',
            health: { cpuUsage: 0, memoryUsage: 0, lastHeartbeat: new Date(), activeTasks: 0, errorRate: 0 }
        }, 'create_coordination_channel', { topic, participants: participantAgentIds });
        TelemetryService_js_1.telemetryService.logEvent('policy_decision', {
            id: `pol-${Date.now()}`,
            policyId: 'agent_governance',
            decision: governanceCheck.allowed ? 'allow' : 'deny',
            reason: governanceCheck.reason,
            actorId: actor,
            resourceId: 'create_coordination_channel',
            timestamp: new Date(),
            context: { topic, participants: participantAgentIds }
        });
        if (!governanceCheck.allowed) {
            throw new Error(`Coordination channel creation prohibited: ${governanceCheck.reason}`);
        }
        // Create coordination channel in store
        const channel = await this.orchestratorStore.createCoordinationChannel(topic, participantAgentIds, actor);
        await this.logAudit(actor, 'create_coordination_channel', `channel:${channel.id}`, `Created coordination channel for topic: ${topic}`);
        // Telemetry for Agent Action
        TelemetryService_js_1.telemetryService.logEvent('agent_action', {
            id: `act-${Date.now()}`,
            agentId: actor,
            actionType: 'create_coordination_channel',
            status: 'success',
            durationMs: 50, // Mocked latency for channel creation (usually fast)
            timestamp: new Date(),
            metadata: { channelId: channel.id }
        });
        return channel;
    }
    /**
     * Initiate consensus process among agents
     */
    async initiateConsensus(coordinatorId, topic, proposal, voterAgentIds, deadlineHours = 24, actor) {
        // Check governance compliance
        const governanceCheck = await subagent_coordinator_js_1.agentGovernance.evaluateAction({
            id: actor,
            name: 'MaestroService',
            tenantId: 'system',
            capabilities: ['consensus', 'governance'],
            metadata: {},
            status: 'active',
            health: { cpuUsage: 0, memoryUsage: 0, lastHeartbeat: new Date(), activeTasks: 0, errorRate: 0 }
        }, 'initiate_consensus', { topic, voters: voterAgentIds });
        if (!governanceCheck.allowed) {
            throw new Error(`Consensus initiation prohibited: ${governanceCheck.reason}`);
        }
        // Create consensus proposal in store
        const consensusProposal = await this.orchestratorStore.initiateConsensus(coordinatorId, topic, proposal, voterAgentIds, deadlineHours, actor);
        await this.logAudit(actor, 'initiate_consensus', `proposal:${consensusProposal.id}`, `Initiated consensus for topic: ${topic}`);
        return consensusProposal;
    }
    /**
     * Record vote for a consensus proposal
     */
    async recordVote(proposalId, agentId, vote) {
        return await this.orchestratorStore.recordVote(proposalId, agentId, vote);
    }
    /**
     * Get coordination metrics for an agent
     */
    async getCoordinationMetrics(agentId) {
        // This could aggregate data from the store about an agent's coordination activities
        return this.subagentCoordinator.getAgentMetrics(agentId);
    }
}
exports.MaestroService = MaestroService;
exports.maestroService = MaestroService.getInstance();
