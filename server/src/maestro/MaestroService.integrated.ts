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
// Import from the same file where the types are defined
import type {
  CoordinationTask,
  CoordinationChannel,
  ConsensusProposal,
  AgentCoordinationMetrics,
  MaestroAgent
} from './model.js';
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
import { OrchestratorPostgresStore } from './store/orchestrator-store.js';

const repoRoot = process.cwd().endsWith(`${path.sep}server`)
  ? path.resolve(process.cwd(), '..')
  : process.cwd();
const DB_PATH = path.resolve(repoRoot, 'server', 'data', 'maestro_db.json');

export class MaestroService {
  private static instance: MaestroService;
  private orchestratorStore: OrchestratorPostgresStore;
  private subagentCoordinator: SubagentCoordinator;
  private initialized = false;

  constructor(private readonly dbPool: Pool) {
    this.subagentCoordinator = SubagentCoordinator.getInstance();
    this.orchestratorStore = new OrchestratorPostgresStore({ pool: dbPool });
  }

  static getInstance(dbPool?: Pool): MaestroService {
    if (!MaestroService.instance) {
      if (!dbPool) {
        throw new Error('Database pool required for MaestroService initialization');
      }
      MaestroService.instance = new MaestroService(dbPool);
    }
    return MaestroService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize the orchestrator store
    await this.orchestratorStore.initialize();

    // Initialize Drift Detection
    driftDetectionService.startMonitoring();

    this.initialized = true;
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
  async getAgents(): Promise<AgentProfile[]> {
    return await this.orchestratorStore.getAgents();
  }

  async updateAgent(id: string, updates: Partial<AgentProfile>, actor: string): Promise<AgentProfile | null> {
    return await this.orchestratorStore.updateAgent(id, updates, actor);
  }

  // --- Autonomic ---
  async getControlLoops(): Promise<AutonomicLoop[]> {
    return await this.orchestratorStore.getLoops();
  }

  async toggleLoop(id: string, status: 'active' | 'paused', actor: string): Promise<boolean> {
    return await this.orchestratorStore.updateLoopStatus(id, status);
  }

  // --- Merge Trains ---
  async getMergeTrainStatus(): Promise<MergeTrain> {
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
  async getExperiments(): Promise<Experiment[]> {
    return await this.orchestratorStore.getExperiments();
  }

  async createExperiment(exp: Experiment, actor: string): Promise<Experiment> {
    return await this.orchestratorStore.createExperiment(exp, actor);
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

    // Create coordination task in persistent store
    const coordinationTask = await this.orchestratorStore.createCoordinationTask({
      ...task,
      ownerId: actor,
      participants: participantAgentIds
    }, actor);

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

    const channel = await this.orchestratorStore.createCoordinationChannel(topic, participantAgentIds, actor);

    await this.logAudit(
      actor,
      'create_coordination_channel',
      `channel:${channel.id}`,
      `Created coordination channel for topic: ${topic}`
    );

    // Estimate duration or track start time if possible. Here we assume near-instant for channel creation
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
   * Record a vote for a consensus proposal
   */
  async recordVote(
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
    return this.subagentCoordinator.getAgentMetrics(agentId);
  }
}

// Export placeholder instance that gets initialized later with database dependencies
export let maestroService: MaestroService;