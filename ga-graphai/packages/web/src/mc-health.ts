export type AgentHealthState = 'healthy' | 'warning' | 'critical' | 'offline';

export interface AgentRegistration {
  agentId: string;
  displayName: string;
  description?: string;
  owner?: string;
  region?: string;
  tier?: string;
  capabilities?: string[];
  maxConcurrency?: number;
  tags?: string[];
}

export interface AgentHeartbeatEvent {
  agentId: string;
  timestamp: number;
  status?: Exclude<AgentHealthState, 'offline'>;
  currentLoad?: number;
  activeTasks?: number;
  queueDepth?: number;
}

export interface AgentTaskEvent {
  agentId: string;
  taskId: string;
  success: boolean;
  durationMs: number;
  tokensConsumed?: number;
  costUsd?: number;
  timestamp: number;
}

export interface AgentAlertEvent {
  agentId: string;
  timestamp: number;
  level: 'warning' | 'critical';
  message: string;
  source?: string;
}

export interface AgentPerformanceSnapshot {
  windowMs: number;
  totalTasks: number;
  completed: number;
  failed: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  throughputPerMin: number;
  tokensPerMin: number;
  costPerMin: number;
  latencyEmaMs: number;
  successEma: number;
}

export interface AgentStatusSnapshot {
  registration: AgentRegistration;
  status: AgentHealthState;
  heartbeatMsAgo: number | null;
  currentLoad: number;
  activeTasks: number;
  queueDepth: number;
  metrics: AgentPerformanceSnapshot;
  alerts: AgentAlertEvent[];
  lastUpdatedAt: number;
  lastHeartbeatStatus: Exclude<AgentHealthState, 'offline'>;
}

export interface AgentIncident extends AgentAlertEvent {
  displayName: string;
}

export interface AgentLeaderboardEntry {
  agentId: string;
  displayName: string;
  status: AgentHealthState;
  metric: number;
}

export interface DashboardSummary {
  totalAgents: number;
  counts: Record<AgentHealthState, number>;
  avgSuccessRate: number;
  avgLatencyMs: number;
  throughputPerMin: number;
  tokensPerMin: number;
  costPerMin: number;
  topByThroughput: AgentLeaderboardEntry[];
  topByReliability: AgentLeaderboardEntry[];
  topByLatency: AgentLeaderboardEntry[];
}

export interface McHealthDashboardData {
  generatedAt: number;
  agents: AgentStatusSnapshot[];
  summary: DashboardSummary;
  incidents: AgentIncident[];
}

export interface McHealthMonitorOptions {
  staleHeartbeatMs?: number;
  metricsWindowMs?: number;
  maxSamplesPerAgent?: number;
  emaAlpha?: number;
}

interface TaskSample {
  timestamp: number;
  durationMs: number;
  success: boolean;
  tokensConsumed: number;
  costUsd: number;
}

interface AgentRuntimeState {
  registration: AgentRegistration;
  lastHeartbeatAt: number | null;
  lastHeartbeatStatus: Exclude<AgentHealthState, 'offline'>;
  currentLoad: number;
  activeTasks: number;
  queueDepth: number;
  samples: TaskSample[];
  alerts: AgentAlertEvent[];
  latencyEmaMs: number | null;
  successEma: number | null;
  lastUpdatedAt: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function percentile(values: number[], percentileValue: number): number {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(percentileValue, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export class McHealthMonitor {
  private readonly agents = new Map<string, AgentRuntimeState>();

  private readonly staleHeartbeatMs: number;

  private readonly metricsWindowMs: number;

  private readonly maxSamplesPerAgent: number;

  private readonly emaAlpha: number;

  constructor(options: McHealthMonitorOptions = {}) {
    this.staleHeartbeatMs = options.staleHeartbeatMs ?? 60_000;
    this.metricsWindowMs = options.metricsWindowMs ?? 15 * 60_000;
    this.maxSamplesPerAgent = options.maxSamplesPerAgent ?? 500;
    this.emaAlpha = clamp(options.emaAlpha ?? 0.2, 0.01, 1);
  }

  registerAgent(registration: AgentRegistration): void {
    const state = this.ensureAgent(registration.agentId);
    state.registration = { ...state.registration, ...registration };
  }

  ingestHeartbeat(event: AgentHeartbeatEvent): void {
    const state = this.ensureAgent(event.agentId);
    const ts = event.timestamp;
    state.lastHeartbeatAt = ts;
    state.lastHeartbeatStatus =
      event.status ?? state.lastHeartbeatStatus ?? 'healthy';
    if (typeof event.currentLoad === 'number') {
      state.currentLoad = clamp(event.currentLoad, 0, 2);
    }
    if (typeof event.activeTasks === 'number') {
      state.activeTasks = Math.max(0, event.activeTasks);
    }
    if (typeof event.queueDepth === 'number') {
      state.queueDepth = Math.max(0, event.queueDepth);
    }
    state.lastUpdatedAt = Math.max(state.lastUpdatedAt, ts);
  }

  ingestTaskResult(event: AgentTaskEvent): void {
    const state = this.ensureAgent(event.agentId);
    const ts = event.timestamp;
    const sample: TaskSample = {
      timestamp: ts,
      durationMs: Math.max(0, event.durationMs),
      success: Boolean(event.success),
      tokensConsumed: Math.max(0, event.tokensConsumed ?? 0),
      costUsd: Math.max(0, event.costUsd ?? 0),
    };
    state.samples.push(sample);
    if (state.samples.length > this.maxSamplesPerAgent) {
      state.samples.splice(0, state.samples.length - this.maxSamplesPerAgent);
    }
    state.latencyEmaMs = this.updateEma(state.latencyEmaMs, sample.durationMs);
    state.successEma = this.updateEma(state.successEma, sample.success ? 1 : 0);
    state.lastUpdatedAt = Math.max(state.lastUpdatedAt, ts);
    this.prune(state, ts);
  }

  ingestAlert(event: AgentAlertEvent): void {
    const state = this.ensureAgent(event.agentId);
    state.alerts.push({ ...event });
    if (state.alerts.length > this.maxSamplesPerAgent) {
      state.alerts.splice(0, state.alerts.length - this.maxSamplesPerAgent);
    }
    state.lastUpdatedAt = Math.max(state.lastUpdatedAt, event.timestamp);
    this.prune(state, event.timestamp);
  }

  getDashboard(now: number = Date.now()): McHealthDashboardData {
    const agents = [...this.agents.values()].map((state) =>
      this.buildSnapshot(state, now),
    );
    agents.sort((a, b) =>
      a.registration.displayName.localeCompare(b.registration.displayName),
    );

    const counts: Record<AgentHealthState, number> = {
      healthy: 0,
      warning: 0,
      critical: 0,
      offline: 0,
    };

    let totalTasks = 0;
    let totalSuccess = 0;
    let weightedLatency = 0;
    let throughputPerMin = 0;
    let tokensPerMin = 0;
    let costPerMin = 0;

    for (const agent of agents) {
      counts[agent.status] += 1;
      const metrics = agent.metrics;
      totalTasks += metrics.totalTasks;
      totalSuccess += metrics.completed;
      weightedLatency += metrics.avgLatencyMs * metrics.totalTasks;
      throughputPerMin += metrics.throughputPerMin;
      tokensPerMin += metrics.tokensPerMin;
      costPerMin += metrics.costPerMin;
    }

    const summary: DashboardSummary = {
      totalAgents: agents.length,
      counts,
      avgSuccessRate: totalTasks > 0 ? totalSuccess / totalTasks : 1,
      avgLatencyMs: totalTasks > 0 ? weightedLatency / totalTasks : 0,
      throughputPerMin,
      tokensPerMin,
      costPerMin,
      topByThroughput: [],
      topByReliability: [],
      topByLatency: [],
    };

    const agentsWithData = agents.filter(
      (agent) => agent.metrics.totalTasks > 0,
    );
    summary.topByThroughput = agentsWithData
      .slice()
      .sort((a, b) => {
        const diff = b.metrics.throughputPerMin - a.metrics.throughputPerMin;
        if (Math.abs(diff) > 0) {
          return diff;
        }
        return a.registration.displayName.localeCompare(
          b.registration.displayName,
        );
      })
      .slice(0, 3)
      .map((agent) => ({
        agentId: agent.registration.agentId,
        displayName: agent.registration.displayName,
        status: agent.status,
        metric: Number(agent.metrics.throughputPerMin.toFixed(3)),
      }));

    summary.topByReliability = agentsWithData
      .slice()
      .sort((a, b) => {
        const diff = b.metrics.successRate - a.metrics.successRate;
        if (Math.abs(diff) > 0) {
          return diff;
        }
        return b.metrics.totalTasks - a.metrics.totalTasks;
      })
      .slice(0, 3)
      .map((agent) => ({
        agentId: agent.registration.agentId,
        displayName: agent.registration.displayName,
        status: agent.status,
        metric: Number(agent.metrics.successRate.toFixed(3)),
      }));

    summary.topByLatency = agentsWithData
      .slice()
      .sort((a, b) => {
        const diff = a.metrics.avgLatencyMs - b.metrics.avgLatencyMs;
        if (Math.abs(diff) > 0) {
          return diff;
        }
        return b.metrics.successRate - a.metrics.successRate;
      })
      .slice(0, 3)
      .map((agent) => ({
        agentId: agent.registration.agentId,
        displayName: agent.registration.displayName,
        status: agent.status,
        metric: Number(agent.metrics.avgLatencyMs.toFixed(1)),
      }));

    const incidents: AgentIncident[] = [];
    for (const agent of agents) {
      for (const alert of agent.alerts) {
        incidents.push({
          ...alert,
          displayName: agent.registration.displayName,
        });
      }
    }
    incidents.sort((a, b) => b.timestamp - a.timestamp);

    return {
      generatedAt: now,
      agents,
      summary,
      incidents,
    };
  }

  private ensureAgent(agentId: string): AgentRuntimeState {
    let existing = this.agents.get(agentId);
    if (existing) {
      return existing;
    }
    const registration: AgentRegistration = {
      agentId,
      displayName: agentId,
    };
    existing = {
      registration,
      lastHeartbeatAt: null,
      lastHeartbeatStatus: 'healthy',
      currentLoad: 0,
      activeTasks: 0,
      queueDepth: 0,
      samples: [],
      alerts: [],
      latencyEmaMs: null,
      successEma: null,
      lastUpdatedAt: Date.now(),
    };
    this.agents.set(agentId, existing);
    return existing;
  }

  private prune(state: AgentRuntimeState, now: number): void {
    const windowStart = now - this.metricsWindowMs;
    if (state.samples.length > 0) {
      state.samples = state.samples.filter(
        (sample) => sample.timestamp >= windowStart,
      );
    }
    if (state.alerts.length > 0) {
      state.alerts = state.alerts.filter(
        (alert) => alert.timestamp >= windowStart,
      );
    }
  }

  private buildSnapshot(
    state: AgentRuntimeState,
    now: number,
  ): AgentStatusSnapshot {
    this.prune(state, now);
    const metrics = this.computeMetrics(state);
    const heartbeatMsAgo = state.lastHeartbeatAt
      ? Math.max(0, now - state.lastHeartbeatAt)
      : null;
    const status = this.deriveStatus(state, metrics, now);
    return {
      registration: { ...state.registration },
      status,
      heartbeatMsAgo,
      currentLoad: state.currentLoad,
      activeTasks: state.activeTasks,
      queueDepth: state.queueDepth,
      metrics,
      alerts: state.alerts.map((alert) => ({ ...alert })),
      lastUpdatedAt: state.lastUpdatedAt,
      lastHeartbeatStatus: state.lastHeartbeatStatus,
    };
  }

  private computeMetrics(state: AgentRuntimeState): AgentPerformanceSnapshot {
    const samples = state.samples;
    const totalTasks = samples.length;
    let completed = 0;
    let sumLatency = 0;
    let tokens = 0;
    let cost = 0;
    const durations: number[] = [];

    for (const sample of samples) {
      if (sample.success) {
        completed += 1;
      }
      sumLatency += sample.durationMs;
      tokens += sample.tokensConsumed;
      cost += sample.costUsd;
      durations.push(sample.durationMs);
    }

    const successRate = totalTasks > 0 ? completed / totalTasks : 1;
    const avgLatency = totalTasks > 0 ? sumLatency / totalTasks : 0;
    const windowMinutes = this.metricsWindowMs / 60_000;
    return {
      windowMs: this.metricsWindowMs,
      totalTasks,
      completed,
      failed: totalTasks - completed,
      successRate,
      avgLatencyMs: avgLatency,
      p95LatencyMs: durations.length > 0 ? percentile(durations, 0.95) : 0,
      throughputPerMin: totalTasks / windowMinutes,
      tokensPerMin: tokens / windowMinutes,
      costPerMin: cost / windowMinutes,
      latencyEmaMs: state.latencyEmaMs ?? avgLatency,
      successEma: state.successEma ?? successRate,
    };
  }

  private deriveStatus(
    state: AgentRuntimeState,
    metrics: AgentPerformanceSnapshot,
    now: number,
  ): AgentHealthState {
    if (
      !state.lastHeartbeatAt ||
      now - state.lastHeartbeatAt > this.staleHeartbeatMs
    ) {
      return 'offline';
    }

    const recentCritical = state.alerts.find(
      (alert) =>
        alert.level === 'critical' &&
        now - alert.timestamp <= this.metricsWindowMs,
    );
    if (recentCritical) {
      return 'critical';
    }

    let status: AgentHealthState = state.lastHeartbeatStatus;

    const recentWarning = state.alerts.find(
      (alert) =>
        alert.level === 'warning' &&
        now - alert.timestamp <= this.metricsWindowMs,
    );
    if (recentWarning && status === 'healthy') {
      status = 'warning';
    }

    if (state.currentLoad >= 1.2) {
      status = 'critical';
    } else if (state.currentLoad >= 0.95 && status === 'healthy') {
      status = 'warning';
    }

    if (metrics.totalTasks >= 5) {
      if (metrics.successRate < 0.7) {
        status = 'critical';
      } else if (metrics.successRate < 0.9 && status === 'healthy') {
        status = 'warning';
      }
    }

    if (metrics.avgLatencyMs > 10_000) {
      status = 'critical';
    } else if (metrics.avgLatencyMs > 5_000 && status === 'healthy') {
      status = 'warning';
    }

    return status;
  }

  private updateEma(current: number | null, observation: number): number {
    if (!Number.isFinite(observation)) {
      return current ?? 0;
    }
    if (current == null || !Number.isFinite(current)) {
      return observation;
    }
    return this.emaAlpha * observation + (1 - this.emaAlpha) * current;
  }
}
