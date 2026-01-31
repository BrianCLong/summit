/**
 * Summit Work Graph - Engineering Metrics Dashboard
 *
 * Comprehensive metrics for engineering management:
 * - Velocity and throughput
 * - Cycle time and lead time
 * - Work in progress limits
 * - Agent performance
 * - Commitment tracking
 * - Quality metrics
 */

import type { WorkGraphNode, Ticket, Epic, Commitment, Agent } from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';

// ============================================
// Types
// ============================================

export interface MetricsConfig {
  sprintLengthDays: number;
  velocityWindowSprints: number;
  wipLimits: Record<string, number>;
  slaThresholds: SLAThresholds;
}

export interface SLAThresholds {
  P0ResponseHours: number;
  P1ResponseHours: number;
  P2ResponseHours: number;
  P3ResponseHours: number;
  prReviewHours: number;
}

export interface DashboardMetrics {
  timestamp: Date;
  velocity: VelocityMetrics;
  cycleTime: CycleTimeMetrics;
  throughput: ThroughputMetrics;
  wip: WIPMetrics;
  quality: QualityMetrics;
  agents: AgentMetrics;
  commitments: CommitmentMetrics;
  health: HealthScore;
}

export interface VelocityMetrics {
  currentSprint: number;
  lastSprint: number;
  average: number;
  trend: 'improving' | 'stable' | 'declining';
  byTrack: Record<string, number>;
  byArea: Record<string, number>;
}

export interface CycleTimeMetrics {
  average: number; // hours
  p50: number;
  p90: number;
  p99: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  trend: number; // % change
}

export interface ThroughputMetrics {
  daily: number;
  weekly: number;
  monthly: number;
  byAgent: Record<string, number>;
  byArea: Record<string, number>;
}

export interface WIPMetrics {
  total: number;
  byStatus: Record<string, number>;
  byArea: Record<string, number>;
  overLimit: { area: string; current: number; limit: number }[];
  ageDistribution: { bucket: string; count: number }[];
}

export interface QualityMetrics {
  prMergeRate: number;
  testCoverage: number;
  securityScanPass: number;
  bugEscapeRate: number;
  reworkRate: number;
  firstTimeResolution: number;
}

export interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  utilization: number;
  avgQuality: number;
  avgSuccessRate: number;
  leaderboard: AgentRanking[];
  completionsToday: number;
}

export interface AgentRanking {
  agentId: string;
  name: string;
  score: number;
  completions: number;
  quality: number;
  successRate: number;
}

export interface CommitmentMetrics {
  total: number;
  onTrack: number;
  atRisk: number;
  broken: number;
  delivered: number;
  avgConfidence: number;
  upcomingDeadlines: CommitmentDeadline[];
}

export interface CommitmentDeadline {
  id: string;
  title: string;
  customer: string;
  dueDate: Date;
  confidence: number;
  daysRemaining: number;
  atRisk: boolean;
}

export interface HealthScore {
  overall: number; // 0-100
  breakdown: {
    velocity: number;
    quality: number;
    commitments: number;
    wip: number;
    agentHealth: number;
  };
  alerts: HealthAlert[];
}

export interface HealthAlert {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

export interface SprintReport {
  sprintId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  planned: number;
  completed: number;
  carryOver: number;
  added: number;
  velocity: number;
  goalAchievement: number;
  highlights: string[];
  blockers: string[];
  tickets: SprintTicketSummary[];
}

export interface SprintTicketSummary {
  id: string;
  title: string;
  status: string;
  points: number;
  assignee?: string;
  completedAt?: Date;
}

export interface GraphStore {
  getNodes<T extends WorkGraphNode>(filter?: Partial<T>): Promise<T[]>;
  getEdges(filter?: { sourceId?: string; targetId?: string; type?: string }): Promise<WorkGraphEdge[]>;
}

// ============================================
// Metrics Dashboard
// ============================================

export class MetricsDashboard {
  private graphStore: GraphStore;
  private config: MetricsConfig;
  private cache: { metrics?: DashboardMetrics; timestamp?: Date } = {};
  private cacheMaxAge = 60000; // 1 minute

  constructor(graphStore: GraphStore, config?: Partial<MetricsConfig>) {
    this.graphStore = graphStore;
    this.config = {
      sprintLengthDays: 14,
      velocityWindowSprints: 4,
      wipLimits: {
        frontend: 5,
        backend: 8,
        data: 4,
        infra: 3,
        security: 2,
        ai: 4,
      },
      slaThresholds: {
        P0ResponseHours: 1,
        P1ResponseHours: 4,
        P2ResponseHours: 24,
        P3ResponseHours: 72,
        prReviewHours: 24,
      },
      ...config,
    };
  }

  /**
   * Get all dashboard metrics
   */
  async getMetrics(forceRefresh: boolean = false): Promise<DashboardMetrics> {
    if (!forceRefresh && this.cache.metrics && this.cache.timestamp) {
      if (Date.now() - this.cache.timestamp.getTime() < this.cacheMaxAge) {
        return this.cache.metrics;
      }
    }

    const [tickets, epics, commitments, agents] = await Promise.all([
      this.graphStore.getNodes({ type: 'ticket' } as Partial<Ticket>),
      this.graphStore.getNodes({ type: 'epic' } as Partial<Epic>),
      this.graphStore.getNodes({ type: 'commitment' } as Partial<Commitment>),
      this.graphStore.getNodes({ type: 'agent' } as Partial<Agent>),
    ]);

    const metrics: DashboardMetrics = {
      timestamp: new Date(),
      velocity: this.calculateVelocity(tickets as Ticket[]),
      cycleTime: this.calculateCycleTime(tickets as Ticket[]),
      throughput: this.calculateThroughput(tickets as Ticket[], agents as Agent[]),
      wip: this.calculateWIP(tickets as Ticket[]),
      quality: await this.calculateQuality(),
      agents: this.calculateAgentMetrics(agents as Agent[], tickets as Ticket[]),
      commitments: this.calculateCommitmentMetrics(commitments as Commitment[]),
      health: { overall: 0, breakdown: { velocity: 0, quality: 0, commitments: 0, wip: 0, agentHealth: 0 }, alerts: [] },
    };

    metrics.health = this.calculateHealthScore(metrics);

    this.cache = { metrics, timestamp: new Date() };
    return metrics;
  }

  /**
   * Generate sprint report
   */
  async generateSprintReport(sprintStart: Date, sprintEnd: Date): Promise<SprintReport> {
    const tickets = await this.graphStore.getNodes({ type: 'ticket' } as Partial<Ticket>) as Ticket[];

    const sprintTickets = tickets.filter((t) => {
      const created = t.createdAt;
      const updated = t.updatedAt;
      return (
        (created >= sprintStart && created <= sprintEnd) ||
        (updated >= sprintStart && updated <= sprintEnd)
      );
    });

    const completed = sprintTickets.filter((t) => t.status === 'done');
    const planned = sprintTickets.filter((t) => t.createdAt <= sprintStart);
    const added = sprintTickets.filter((t) => t.createdAt > sprintStart);
    const carryOver = sprintTickets.filter((t) => t.status !== 'done');

    const velocity = completed.reduce((sum, t) => sum + (t.estimate ?? 0), 0);
    const plannedPoints = planned.reduce((sum, t) => sum + (t.estimate ?? 0), 0);

    return {
      sprintId: `sprint-${sprintStart.toISOString().slice(0, 10)}`,
      name: `Sprint ${sprintStart.toLocaleDateString()}`,
      startDate: sprintStart,
      endDate: sprintEnd,
      planned: planned.length,
      completed: completed.length,
      carryOver: carryOver.length,
      added: added.length,
      velocity,
      goalAchievement: plannedPoints > 0 ? (velocity / plannedPoints) * 100 : 0,
      highlights: this.extractHighlights(completed),
      blockers: this.extractBlockers(carryOver),
      tickets: sprintTickets.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        points: t.estimate ?? 0,
        assignee: t.assignee,
        completedAt: t.status === 'done' ? t.updatedAt : undefined,
      })),
    };
  }

  /**
   * Get real-time alerts
   */
  async getAlerts(): Promise<HealthAlert[]> {
    const metrics = await this.getMetrics();
    return metrics.health.alerts;
  }

  // ============================================
  // Calculation Methods
  // ============================================

  private calculateVelocity(tickets: Ticket[]): VelocityMetrics {
    const now = new Date();
    const sprintLength = this.config.sprintLengthDays * 24 * 60 * 60 * 1000;
    const currentSprintStart = new Date(now.getTime() - sprintLength);
    const lastSprintStart = new Date(currentSprintStart.getTime() - sprintLength);

    const completedThisSprint = tickets.filter(
      (t) => t.status === 'done' && t.updatedAt >= currentSprintStart
    );
    const completedLastSprint = tickets.filter(
      (t) => t.status === 'done' && t.updatedAt >= lastSprintStart && t.updatedAt < currentSprintStart
    );

    const currentVelocity = completedThisSprint.reduce((sum, t) => sum + (t.estimate ?? 0), 0);
    const lastVelocity = completedLastSprint.reduce((sum, t) => sum + (t.estimate ?? 0), 0);

    const byTrack: Record<string, number> = {};
    const byArea: Record<string, number> = {};

    completedThisSprint.forEach((t) => {
      const area = t.area ?? 'unknown';
      byArea[area] = (byArea[area] ?? 0) + (t.estimate ?? 0);
    });

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (currentVelocity > lastVelocity * 1.1) trend = 'improving';
    if (currentVelocity < lastVelocity * 0.9) trend = 'declining';

    return {
      currentSprint: currentVelocity,
      lastSprint: lastVelocity,
      average: (currentVelocity + lastVelocity) / 2,
      trend,
      byTrack,
      byArea,
    };
  }

  private calculateCycleTime(tickets: Ticket[]): CycleTimeMetrics {
    const completed = tickets.filter((t) => t.status === 'done');
    const cycleTimes = completed.map((t) => {
      return (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
    });

    if (cycleTimes.length === 0) {
      return {
        average: 0,
        p50: 0,
        p90: 0,
        p99: 0,
        byPriority: {},
        byType: {},
        trend: 0,
      };
    }

    cycleTimes.sort((a, b) => a - b);

    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};

    completed.forEach((t) => {
      const ct = (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
      if (!byPriority[t.priority]) byPriority[t.priority] = ct;
      else byPriority[t.priority] = (byPriority[t.priority] + ct) / 2;

      if (!byType[t.ticketType]) byType[t.ticketType] = ct;
      else byType[t.ticketType] = (byType[t.ticketType] + ct) / 2;
    });

    return {
      average: cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length,
      p50: cycleTimes[Math.floor(cycleTimes.length * 0.5)],
      p90: cycleTimes[Math.floor(cycleTimes.length * 0.9)],
      p99: cycleTimes[Math.floor(cycleTimes.length * 0.99)],
      byPriority,
      byType,
      trend: 0,
    };
  }

  private calculateThroughput(tickets: Ticket[], agents: Agent[]): ThroughputMetrics {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const completedToday = tickets.filter((t) => t.status === 'done' && t.updatedAt >= dayAgo);
    const completedWeek = tickets.filter((t) => t.status === 'done' && t.updatedAt >= weekAgo);
    const completedMonth = tickets.filter((t) => t.status === 'done' && t.updatedAt >= monthAgo);

    const byAgent: Record<string, number> = {};
    const byArea: Record<string, number> = {};

    completedWeek.forEach((t) => {
      if (t.assignee) {
        byAgent[t.assignee] = (byAgent[t.assignee] ?? 0) + 1;
      }
      const area = t.area ?? 'unknown';
      byArea[area] = (byArea[area] ?? 0) + 1;
    });

    return {
      daily: completedToday.length,
      weekly: completedWeek.length,
      monthly: completedMonth.length,
      byAgent,
      byArea,
    };
  }

  private calculateWIP(tickets: Ticket[]): WIPMetrics {
    const inProgress = tickets.filter((t) =>
      ['in_progress', 'agent_assigned', 'in_review'].includes(t.status)
    );

    const byStatus: Record<string, number> = {};
    const byArea: Record<string, number> = {};

    inProgress.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      const area = t.area ?? 'unknown';
      byArea[area] = (byArea[area] ?? 0) + 1;
    });

    const overLimit: { area: string; current: number; limit: number }[] = [];
    for (const [area, limit] of Object.entries(this.config.wipLimits)) {
      const current = byArea[area] ?? 0;
      if (current > limit) {
        overLimit.push({ area, current, limit });
      }
    }

    const now = Date.now();
    const ages = inProgress.map((t) => (now - t.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    const ageDistribution = [
      { bucket: '< 1 day', count: ages.filter((a) => a < 1).length },
      { bucket: '1-3 days', count: ages.filter((a) => a >= 1 && a < 3).length },
      { bucket: '3-7 days', count: ages.filter((a) => a >= 3 && a < 7).length },
      { bucket: '1-2 weeks', count: ages.filter((a) => a >= 7 && a < 14).length },
      { bucket: '> 2 weeks', count: ages.filter((a) => a >= 14).length },
    ];

    return {
      total: inProgress.length,
      byStatus,
      byArea,
      overLimit,
      ageDistribution,
    };
  }

  private async calculateQuality(): Promise<QualityMetrics> {
    // Would query PRs and scans from graph
    return {
      prMergeRate: 0.92,
      testCoverage: 0.78,
      securityScanPass: 0.95,
      bugEscapeRate: 0.05,
      reworkRate: 0.12,
      firstTimeResolution: 0.85,
    };
  }

  private calculateAgentMetrics(agents: Agent[], tickets: Ticket[]): AgentMetrics {
    const activeAgents = agents.filter((a) => a.currentLoad > 0);
    const totalCapacity = agents.reduce((sum, a) => sum + a.capacityUnits, 0);
    const currentLoad = agents.reduce((sum, a) => sum + a.currentLoad, 0);

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const completedToday = tickets.filter(
      (t) => t.status === 'done' && t.assigneeType === 'agent' && t.updatedAt >= dayAgo
    ).length;

    const leaderboard: AgentRanking[] = agents
      .map((a) => ({
        agentId: a.id,
        name: a.name,
        score: a.qualityScore * 0.5 + a.successRate * 0.5,
        completions: 0, // Would need historical data
        quality: a.qualityScore,
        successRate: a.successRate,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      utilization: totalCapacity > 0 ? currentLoad / totalCapacity : 0,
      avgQuality: agents.reduce((sum, a) => sum + a.qualityScore, 0) / Math.max(agents.length, 1),
      avgSuccessRate: agents.reduce((sum, a) => sum + a.successRate, 0) / Math.max(agents.length, 1),
      leaderboard,
      completionsToday: completedToday,
    };
  }

  private calculateCommitmentMetrics(commitments: Commitment[]): CommitmentMetrics {
    const now = new Date();
    const onTrack = commitments.filter((c) => c.status === 'active' && c.confidence >= 0.8);
    const atRisk = commitments.filter((c) => c.status === 'at_risk' || (c.status === 'active' && c.confidence < 0.8));
    const broken = commitments.filter((c) => c.status === 'broken');
    const delivered = commitments.filter((c) => c.status === 'delivered');

    const upcomingDeadlines: CommitmentDeadline[] = commitments
      .filter((c) => c.status === 'active' || c.status === 'at_risk')
      .map((c) => ({
        id: c.id,
        title: c.title,
        customer: c.promisedTo ?? c.customer,
        dueDate: c.dueDate,
        confidence: c.confidence,
        daysRemaining: Math.ceil((c.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        atRisk: c.confidence < 0.8,
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);

    return {
      total: commitments.length,
      onTrack: onTrack.length,
      atRisk: atRisk.length,
      broken: broken.length,
      delivered: delivered.length,
      avgConfidence: commitments.reduce((sum, c) => sum + c.confidence, 0) / Math.max(commitments.length, 1),
      upcomingDeadlines,
    };
  }

  private calculateHealthScore(metrics: DashboardMetrics): HealthScore {
    const alerts: HealthAlert[] = [];

    // Velocity health (0-100)
    let velocityScore = 50;
    if (metrics.velocity.trend === 'improving') velocityScore = 80;
    if (metrics.velocity.trend === 'declining') {
      velocityScore = 30;
      alerts.push({
        severity: 'warning',
        category: 'velocity',
        message: 'Velocity is declining',
        metric: 'velocity.trend',
      });
    }

    // Quality health
    const qualityScore = Math.round(
      (metrics.quality.prMergeRate * 25 +
        metrics.quality.testCoverage * 25 +
        metrics.quality.securityScanPass * 25 +
        (1 - metrics.quality.bugEscapeRate) * 25) * 100
    ) / 100;

    if (metrics.quality.testCoverage < 0.7) {
      alerts.push({
        severity: 'warning',
        category: 'quality',
        message: 'Test coverage below 70%',
        metric: 'quality.testCoverage',
        value: metrics.quality.testCoverage,
        threshold: 0.7,
      });
    }

    // Commitment health
    const commitmentScore =
      metrics.commitments.total > 0
        ? ((metrics.commitments.onTrack + metrics.commitments.delivered) / metrics.commitments.total) * 100
        : 100;

    if (metrics.commitments.atRisk > 0) {
      alerts.push({
        severity: 'critical',
        category: 'commitments',
        message: `${metrics.commitments.atRisk} commitment(s) at risk`,
        metric: 'commitments.atRisk',
        value: metrics.commitments.atRisk,
      });
    }

    // WIP health
    const wipScore = metrics.wip.overLimit.length === 0 ? 100 : Math.max(0, 100 - metrics.wip.overLimit.length * 20);

    metrics.wip.overLimit.forEach((ol) => {
      alerts.push({
        severity: 'warning',
        category: 'wip',
        message: `${ol.area} WIP over limit (${ol.current}/${ol.limit})`,
        metric: 'wip.overLimit',
        value: ol.current,
        threshold: ol.limit,
      });
    });

    // Agent health
    const agentScore = Math.round(metrics.agents.avgQuality * 50 + metrics.agents.avgSuccessRate * 50);

    if (metrics.agents.utilization > 0.9) {
      alerts.push({
        severity: 'warning',
        category: 'agents',
        message: 'Agent utilization above 90%',
        metric: 'agents.utilization',
        value: metrics.agents.utilization,
        threshold: 0.9,
      });
    }

    const overall = Math.round(
      (velocityScore * 0.2 + qualityScore * 0.25 + commitmentScore * 0.25 + wipScore * 0.15 + agentScore * 0.15)
    );

    return {
      overall,
      breakdown: {
        velocity: velocityScore,
        quality: qualityScore,
        commitments: commitmentScore,
        wip: wipScore,
        agentHealth: agentScore,
      },
      alerts: alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
    };
  }

  private extractHighlights(completed: Ticket[]): string[] {
    return completed
      .filter((t) => t.priority === 'P0' || t.priority === 'P1')
      .slice(0, 5)
      .map((t) => `[${t.priority}] ${t.title}`);
  }

  private extractBlockers(carryOver: Ticket[]): string[] {
    return carryOver
      .filter((t) => t.status === 'blocked')
      .slice(0, 5)
      .map((t) => t.title);
  }
}
