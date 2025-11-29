export interface HealthSnapshot {
  overallScore: number;
  workstreams: {
    name: string;
    status: 'healthy' | 'degraded' | 'incident';
    score: number;
  }[];
  activeAlerts: Alert[];
}

export interface Alert {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
}

export interface DashboardStats {
  activeRuns: number;
  completedRuns: number;
  failedRuns: number;
  totalRuns: number;
  tasksPerMinute: number;
  successRate: number;
}

export interface AutonomicLoop {
  id: string;
  name: string;
  type: 'reliability' | 'cost' | 'performance' | 'safety';
  status: 'active' | 'paused';
  lastDecision: string;
  lastRun: string;
  config: Record<string, any>;
}

export interface DashboardData {
  health: HealthSnapshot;
  stats: DashboardStats;
  autonomic: {
    activeLoops: number;
    totalLoops: number;
    recentDecisions: string[];
  };
}

export interface Run {
  id: string;
  pipeline: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  started_at: string;
  duration_ms: number;
  cost: number;
  tenant_id: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  model: string;
  status: 'healthy' | 'degraded';
  metrics: {
    successRate: number;
    latencyP95: number;
    costPerTask: number;
  };
  routingWeight: number;
}

export interface MergeTrain {
  id: string;
  status: 'active' | 'paused' | 'locked';
  queueLength: number;
  throughput: number;
  activePRs: PullRequest[];
}

export interface PullRequest {
  number: number;
  title: string;
  author: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'manual_check';
  url: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
  status: 'allowed' | 'denied';
}
