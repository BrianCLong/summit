export interface HealthSnapshot {
  overallScore: number; // 0-100
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

export interface SLOSnapshot {
  name: string;
  target: number;
  current: number; // e.g., 99.95
  errorBudget: number; // Remaining budget
  status: 'healthy' | 'risk' | 'breached';
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
  throughput: number; // PRs per day
  activePRs: PullRequest[];
}

export interface PullRequest {
  number: number;
  title: string;
  author: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'manual_check';
  url: string;
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  status: 'running' | 'completed' | 'draft';
  variants: string[];
  metrics: Record<string, any>;
  startDate: string;
  endDate?: string;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  isEnabled: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
  status: 'allowed' | 'denied';
  policyId?: string;
}
