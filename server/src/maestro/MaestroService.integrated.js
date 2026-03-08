"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maestroService = exports.MaestroService = void 0;
const path_1 = __importDefault(require("path"));
const runs_repo_js_1 = require("./runs/runs-repo.js");
const subagent_coordinator_js_1 = require("./subagent-coordinator.js");
const KillSwitchService_js_1 = require("../services/KillSwitchService.js");
const TelemetryService_js_1 = require("../services/TelemetryService.js");
const DriftDetectionService_js_1 = require("../services/DriftDetectionService.js");
const orchestrator_store_js_1 = require("./store/orchestrator-store.js");
const repoRoot = process.cwd().endsWith(`${path_1.default.sep}server`)
    ? path_1.default.resolve(process.cwd(), '..')
    : process.cwd();
const DB_PATH = path_1.default.resolve(repoRoot, 'server', 'data', 'maestro_db.json');
class MaestroService {
    dbPool;
    static instance;
    orchestratorStore;
    subagentCoordinator;
    initialized = false;
    constructor(dbPool) {
        this.dbPool = dbPool;
        this.subagentCoordinator = subagent_coordinator_js_1.SubagentCoordinator.getInstance();
        this.orchestratorStore = new orchestrator_store_js_1.OrchestratorPostgresStore({ pool: dbPool });
    }
    static getInstance(dbPool) {
        if (!MaestroService.instance) {
            if (!dbPool) {
                throw new Error('Database pool required for MaestroService initialization');
            }
            MaestroService.instance = new MaestroService(dbPool);
        }
        return MaestroService.instance;
    }
    async initialize() {
        if (this.initialized)
            return;
        // Initialize the orchestrator store
        await this.orchestratorStore.initialize();
        // Initialize Drift Detection
        DriftDetectionService_js_1.driftDetectionService.startMonitoring();
        this.initialized = true;
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
    // --- Merge Trains ---
    async getMergeTrainStatus() {
        // In a real system, this would query the Merge Train service or DB
        // Simulating active state
        return {
            id: 'mt-main',
            status: 'active',
            queueLength: 3,
            throughput: 12,
            activePRs: [
                { number: 1234, title: 'feat: New auth flow', author: 'alice', status: 'running', url: '#' },
                { number: 1235, title: 'fix: Typo in docs', author: 'bob', status: 'queued', url: '#' },
                { number: 1236, title: 'chore: Bump deps', author: 'charlie', status: 'queued', url: '#' },
            ],
        };
    }
    // --- Experiments & Playbooks ---
    async getExperiments() {
        return await this.orchestratorStore.getExperiments();
    }
    async createExperiment(exp, actor) {
        return await this.orchestratorStore.createExperiment(exp, actor);
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
        // Create coordination task in persistent store
        const coordinationTask = await this.orchestratorStore.createCoordinationTask({
            ...task,
            ownerId: actor,
            participants: participantAgentIds
        }, actor);
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
        const channel = await this.orchestratorStore.createCoordinationChannel(topic, participantAgentIds, actor);
        await this.logAudit(actor, 'create_coordination_channel', `channel:${channel.id}`, `Created coordination channel for topic: ${topic}`);
        // Estimate duration or track start time if possible. Here we assume near-instant for channel creation
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
        const consensusProposal = await this.orchestratorStore.initiateConsensus(coordinatorId, topic, proposal, voterAgentIds, deadlineHours, actor);
        await this.logAudit(actor, 'initiate_consensus', `proposal:${consensusProposal.id}`, `Initiated consensus for topic: ${topic}`);
        return consensusProposal;
    }
    /**
     * Record a vote for a consensus proposal
     */
    async recordVote(proposalId, agentId, vote) {
        return await this.orchestratorStore.recordVote(proposalId, agentId, vote);
    }
    /**
     * Get coordination metrics for an agent
     */
    async getCoordinationMetrics(agentId) {
        return this.subagentCoordinator.getAgentMetrics(agentId);
    }
}
exports.MaestroService = MaestroService;
