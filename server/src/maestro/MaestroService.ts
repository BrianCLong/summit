import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { runsRepo } from './runs/runs-repo.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../data/maestro_db.json');

interface MaestroDB {
  loops: AutonomicLoop[];
  experiments: Experiment[];
  playbooks: Playbook[];
  auditLog: AuditEvent[];
  agents: AgentProfile[];
}

const DEFAULT_DB: MaestroDB = {
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

export class MaestroService {
  private static instance: MaestroService;
  private dbCache: MaestroDB | null = null;

  private constructor() {}

  static getInstance(): MaestroService {
    if (!MaestroService.instance) {
      MaestroService.instance = new MaestroService();
    }
    return MaestroService.instance;
  }

  private async getDB(): Promise<MaestroDB> {
    if (this.dbCache) return this.dbCache;
    try {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      this.dbCache = JSON.parse(data);
    } catch (err) {
      this.dbCache = { ...DEFAULT_DB }; // Clone defaults
      await this.saveDB();
    }
    return this.dbCache!;
  }

  private async saveDB(): Promise<void> {
    if (!this.dbCache) return;
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(this.dbCache, null, 2));
    } catch (err) {
      console.error('Failed to save Maestro DB:', err);
    }
  }

  // --- Dashboard ---

  async getHealthSnapshot(tenantId: string): Promise<HealthSnapshot> {
    const runs = await runsRepo.list(tenantId, 100);
    const recentFailures = runs.filter(
      (r) => r.status === 'failed' && new Date(r.created_at).getTime() > Date.now() - 3600000,
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
  async getAgents(): Promise<AgentProfile[]> {
    const db = await this.getDB();
    return db.agents;
  }

  async updateAgent(id: string, updates: Partial<AgentProfile>, actor: string): Promise<AgentProfile | null> {
    const db = await this.getDB();
    const index = db.agents.findIndex((a) => a.id === id);
    if (index === -1) return null;

    db.agents[index] = { ...db.agents[index], ...updates };
    await this.logAudit(actor, 'update_agent', id, `Updated agent ${id}`);
    await this.saveDB();
    return db.agents[index];
  }

  // --- Autonomic ---
  async getControlLoops(): Promise<AutonomicLoop[]> {
    const db = await this.getDB();
    return db.loops;
  }

  async toggleLoop(id: string, status: 'active' | 'paused', actor: string): Promise<boolean> {
    const db = await this.getDB();
    const loop = db.loops.find((l) => l.id === id);
    if (!loop) return false;
    loop.status = status;
    await this.logAudit(actor, 'toggle_loop', id, `Set loop ${id} to ${status}`);
    await this.saveDB();
    return true;
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
    const db = await this.getDB();
    return db.experiments;
  }

  async createExperiment(exp: Experiment, actor: string): Promise<Experiment> {
    const db = await this.getDB();
    db.experiments.push(exp);
    await this.logAudit(actor, 'create_experiment', exp.id, `Created experiment ${exp.name}`);
    await this.saveDB();
    return exp;
  }

  async getPlaybooks(): Promise<Playbook[]> {
    const db = await this.getDB();
    return db.playbooks;
  }

  // --- Audit ---
  async getAuditLog(): Promise<AuditEvent[]> {
    const db = await this.getDB();
    return db.auditLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async logAudit(actor: string, action: string, resource: string, details: string) {
    const db = await this.getDB();
    db.auditLog.push({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      actor,
      action,
      resource,
      details,
      status: 'allowed',
    });
    // Keep log size manageable
    if (db.auditLog.length > 1000) db.auditLog.shift();
    await this.saveDB();
  }
}

export const maestroService = MaestroService.getInstance();
