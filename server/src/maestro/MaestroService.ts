// @ts-nocheck
import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import { metrics } from '../observability/metrics.js';
import { runsRepo } from './runs/runs-repo.js';
import { SubagentCoordinator, agentGovernance } from './subagent-coordinator.js';
import { killSwitchService } from '../services/KillSwitchService.js';
import { telemetryService } from '../services/TelemetryService.js';
import { driftDetectionService } from '../services/DriftDetectionService.js';
import { OrchestratorPostgresStore } from './store/orchestrator-store.js';
import type {
  CoordinationTask,
  CoordinationChannel,
  ConsensusProposal,
  AgentCoordinationMetrics,
  MaestroAgent
} from './types.js';
import { AgentGovernanceService } from './governance-service.js';
import {
  HealthSnapshot,
  SLOSnapshot,
  AutonomicLoop,
  AgentProfile,
  MergeTrain,
  Experiment,
  Playbook,
  AuditEvent,
} from './types.js';

// Interface representing the orchestrator store
interface OrchestratorStore {
  initialize(): Promise<void>;
  getLoops(): Promise<AutonomicLoop[]>;
  getLoopById(id: string): Promise<AutonomicLoop | null>;
  updateLoopStatus(id: string, status: 'active' | 'paused' | 'inactive'): Promise<boolean>;
  getAgents(): Promise<MaestroAgent[]>;
  getAgentById(id: string): Promise<MaestroAgent | null>;
  updateAgent(id: string, updates: Partial<MaestroAgent>, actor: string): Promise<MaestroAgent | null>;
  getExperiments(): Promise<Experiment[]>;
  createExperiment(experiment: Experiment, actor: string): Promise<Experiment>;
  getPlaybooks(): Promise<Playbook[]>;
  createCoordinationTask(task: Omit<CoordinationTask, 'id' | 'createdAt' | 'updatedAt' | 'result' | 'error'>, actor: string): Promise<CoordinationTask>;
  getCoordinationTaskById(id: string): Promise<CoordinationTask | null>;
  updateCoordinationTaskStatus(id: string, status: string): Promise<boolean>;
  createCoordinationChannel(topic: string, participantAgentIds: string[], actor: string): Promise<CoordinationChannel>;
  getCoordinationChannelById(id: string): Promise<CoordinationChannel | null>;
  initiateConsensus<T>(coordinatorId: string, topic: string, proposal: T, voterAgentIds: string[], deadlineHours: number, actor: string): Promise<ConsensusProposal<T>>;
  getConsensusProposalById<T>(id: string): Promise<ConsensusProposal<T> | null>;
  recordVote<T>(proposalId: string, agentId: string, vote: { decision: 'approve' | 'reject' | 'abstain'; reason?: string; weight?: number }): Promise<boolean>;
  getAuditLog(limit: number): Promise<AuditEvent[]>;
  logAudit(actor: string, action: string, resource: string, details: string, status?: string): Promise<void>;
}

export class MaestroService {
  private static instance: MaestroService;
  private orchestratorStore: OrchestratorStore;
  private subagentCoordinator: SubagentCoordinator;

  private constructor(dbPool?: Pool) {
    this.subagentCoordinator = SubagentCoordinator.getInstance();
    // Initialize with PostgreSQL store if pool is provided, otherwise use in-memory
    this.orchestratorStore = dbPool ? new OrchestratorPostgresStore(dbPool) : this.createInMemoryStore();
    driftDetectionService.startMonitoring();
  }

  static getInstance(dbPool?: Pool): MaestroService {
    if (!MaestroService.instance) {
      MaestroService.instance = new MaestroService(dbPool);
    }
    return MaestroService.instance;
  }

  private createInMemoryStore(): OrchestratorStore {
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
      getLoopById: async (id: string) => inMemoryData.loops.find(loop => loop.id === id) || null,
      updateLoopStatus: async (id: string, status: 'active' | 'paused' | 'inactive') => {
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
      getAgentById: async (id: string) => {
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
      updateAgent: async (id: string, updates: Partial<MaestroAgent>, actor: string) => {
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
      createExperiment: async (experiment: Experiment, actor: string) => {
        inMemoryData.experiments.push(experiment);
        await this.logAudit(actor, 'create_experiment', experiment.id, `Created experiment ${experiment.name}`);
        return experiment;
      },
      getPlaybooks: async () => inMemoryData.playbooks,
      createCoordinationTask: async (task, actor) => {
        const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const coordinationTask: CoordinationTask = {
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
      getCoordinationTaskById: async (id: string) => null, // Implement as needed
      updateCoordinationTaskStatus: async (id: string, status: string) => false, // Implement as needed
      createCoordinationChannel: async (topic, participantAgentIds, actor) => {
        const id = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const channel: CoordinationChannel = {
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
      getCoordinationChannelById: async (id: string) => null, // Implement as needed
      initiateConsensus: async <T>(coordinatorId, topic, proposal, voterAgentIds, deadlineHours, actor) => {
        const id = `consensus_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);
        const consensusProposal: ConsensusProposal<T> = {
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
      getConsensusProposalById: async <T>(id: string) => null, // Implement as needed
      recordVote: async <T>(proposalId, agentId, vote) => false, // Implement as needed
      getAuditLog: async (limit: number = 100) => inMemoryData.auditLog.slice(0, limit),
      logAudit: async (actor: string, action: string, resource: string, details: string, status: string = 'allowed') => {
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
        if (inMemoryData.auditLog.length > 1000) inMemoryData.auditLog = inMemoryData.auditLog.slice(0, 1000);
      },
    };
  }

  async initialize(): Promise<void> {
    await this.orchestratorStore.initialize();
  }

  // --- Dashboard ---

  async getHealthSnapshot(tenantId: string): Promise<HealthSnapshot> {
    const runs = await runsRepo.list(tenantId, 100);
    const recentFailures = runs.filter(
      (r: any) => r.status === 'failed' && new Date(r.created_at).getTime() > Date.now() - 3600000,
    ).length;

    let overallScore = 100;
    if (recentFailures > 5) overallScore -= 20;
    if (recentFailures > 15) overallScore -= 40;

    return {
      overallScore: Math.max(0, overallScore),
      workstreams: [
        { name: 'MC-Core', status: overallScore > 80 ? 'healthy' : 'degraded', score: overallScore },
        { name: 'MergeTrain', status: 'healthy', score: 98 },
        { name: 'IntelGraph-Ingest', status: 'healthy', score: 95 },
        { name: 'UI/UX', status: 'healthy', score: 100 },
      ],
      activeAlerts:
        overallScore < 90
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

  async getDashboardStats(tenantId: string) {
    const runs = await runsRepo.list(tenantId, 1000);
    const activeRuns = runs.filter((r: any) => r.status === 'running').length;
    const completedRuns = runs.filter((r: any) => r.status === 'succeeded').length;
    const failedRuns = runs.filter((r: any) => r.status === 'failed').length;

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
  async getAgents(): Promise<MaestroAgent[]> {
    return await this.orchestratorStore.getAgents();
  }

  async updateAgent(id: string, updates: Partial<MaestroAgent>, actor: string): Promise<MaestroAgent | null> {
    return await this.orchestratorStore.updateAgent(id, updates, actor);
  }

  // --- Autonomic ---
  async getControlLoops(): Promise<AutonomicLoop[]> {
    return await this.orchestratorStore.getLoops();
  }

  async toggleLoop(id: string, status: 'active' | 'paused', actor: string): Promise<boolean> {
    return await this.orchestratorStore.updateLoopStatus(id, status);
  }

  // --- Experiments & Playbooks ---
  async getExperiments(): Promise<Experiment[]> {
    return await this.orchestratorStore.getExperiments();
  }

  async createExperiment(experiment: Experiment, actor: string): Promise<Experiment> {
    return await this.orchestratorStore.createExperiment(experiment, actor);
  }

  async getPlaybooks(): Promise<Playbook[]> {
    return await this.orchestratorStore.getPlaybooks();
  }

  // --- Audit ---
  async getAuditLog(limit: number = 100): Promise<AuditEvent[]> {
    return await this.orchestratorStore.getAuditLog(limit);
  }

  async logAudit(actor: string, action: string, resource: string, details: string, status: string = 'allowed') {
    await this.orchestratorStore.logAudit(actor, action, resource, details, status);
  }

  // --- Subagent Coordination Methods ---

  /**
   * Coordinate tasks between multiple agents
   */
  async coordinateAgents(
    task: Omit<CoordinationTask, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'result' | 'error'>,
    participantAgentIds: string[],
    actor: string
  ): Promise<CoordinationTask> {
    // 1. Kill Switch Check
    const healthCheck = killSwitchService.checkSystemHealth({ agentId: actor, feature: 'agent_coordination' });
    if (!healthCheck.allowed) {
        throw new Error(`System Kill Switch Active: ${healthCheck.reason}`);
    }

    // 2. First, check governance compliance
    const governanceCheck = await agentGovernance.evaluateAction(
      {
        id: actor,
        name: 'MaestroService',
        tenantId: 'system',
        capabilities: ['coordination', 'orchestration'],
        metadata: {},
        status: 'active',
        health: { cpuUsage: 0, memoryUsage: 0, lastHeartbeat: new Date(), activeTasks: 0, errorRate: 0 }
      } as MaestroAgent,
      'coordinate_agents',
      { task, participants: participantAgentIds }
    );

    // Telemetry for Policy Decision
    telemetryService.logEvent('policy_decision', {
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

    await this.logAudit(
      actor,
      'coordinate_agents',
      `coordination_task:${coordinationTask.id}`,
      `Coordinated task ${task.title} among ${participantAgentIds.length} agents`
    );

    // Telemetry for Agent Action
    const duration = Date.now() - (task.createdAt ? new Date(task.createdAt).getTime() : Date.now());
    telemetryService.logEvent('agent_action', {
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
  async createCoordinationChannel(
    topic: string,
    participantAgentIds: string[],
    actor: string
  ): Promise<CoordinationChannel> {
    // 1. Kill Switch Check
    const healthCheck = killSwitchService.checkSystemHealth({ agentId: actor, feature: 'coordination_channel' });
    if (!healthCheck.allowed) {
        throw new Error(`System Kill Switch Active: ${healthCheck.reason}`);
    }

    // Check governance compliance
    const governanceCheck = await agentGovernance.evaluateAction(
      {
        id: actor,
        name: 'MaestroService',
        tenantId: 'system',
        capabilities: ['coordination', 'orchestration'],
        metadata: {},
        status: 'active',
        health: { cpuUsage: 0, memoryUsage: 0, lastHeartbeat: new Date(), activeTasks: 0, errorRate: 0 }
      },
      'create_coordination_channel',
      { topic, participants: participantAgentIds }
    );

    telemetryService.logEvent('policy_decision', {
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

    await this.logAudit(
      actor,
      'create_coordination_channel',
      `channel:${channel.id}`,
      `Created coordination channel for topic: ${topic}`
    );

    // Telemetry for Agent Action
    telemetryService.logEvent('agent_action', {
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
  async initiateConsensus<T>(
    coordinatorId: string,
    topic: string,
    proposal: T,
    voterAgentIds: string[],
    deadlineHours: number = 24,
    actor: string
  ): Promise<ConsensusProposal<T>> {
    // Check governance compliance
    const governanceCheck = await agentGovernance.evaluateAction(
      {
        id: actor,
        name: 'MaestroService',
        tenantId: 'system',
        capabilities: ['consensus', 'governance'],
        metadata: {},
        status: 'active',
        health: { cpuUsage: 0, memoryUsage: 0, lastHeartbeat: new Date(), activeTasks: 0, errorRate: 0 }
      },
      'initiate_consensus',
      { topic, voters: voterAgentIds }
    );

    if (!governanceCheck.allowed) {
      throw new Error(`Consensus initiation prohibited: ${governanceCheck.reason}`);
    }

    // Create consensus proposal in store
    const consensusProposal = await this.orchestratorStore.initiateConsensus(
      coordinatorId,
      topic,
      proposal,
      voterAgentIds,
      deadlineHours,
      actor
    );

    await this.logAudit(
      actor,
      'initiate_consensus',
      `proposal:${consensusProposal.id}`,
      `Initiated consensus for topic: ${topic}`
    );

    return consensusProposal;
  }

  /**
   * Record vote for a consensus proposal
   */
  async recordVote<T>(
    proposalId: string,
    agentId: string,
    vote: { decision: 'approve' | 'reject' | 'abstain'; reason?: string; weight?: number }
  ): Promise<boolean> {
    return await this.orchestratorStore.recordVote(proposalId, agentId, vote);
  }

  /**
   * Get coordination metrics for an agent
   */
  async getCoordinationMetrics(agentId: string): Promise<any | null> {
    // This could aggregate data from the store about an agent's coordination activities
    return this.subagentCoordinator.getAgentMetrics(agentId);
  }
}

export const maestroService = MaestroService.getInstance();