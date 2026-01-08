export type WorkItemStatus = "ready" | "in_progress" | "review" | "blocked" | "done";

export interface ReadyChecklist {
  specProvided: boolean;
  metricsDefined: boolean;
  rollbackPlan: boolean;
  ownerAssigned: boolean;
}

export interface WorkItem {
  id: string;
  team: string;
  status: WorkItemStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  blockedWindows?: Array<{ start: Date; end?: Date }>;
  reworkCount?: number;
  estimateDays?: number;
  riskAccepted?: boolean;
  ready: ReadyChecklist;
}

export interface PullRequest {
  id: string;
  team: string;
  author: string;
  filesChanged: number;
  linesChanged: number;
  createdAt: Date;
  riskAccepted?: boolean;
}

export interface DecisionRecord {
  id: string;
  owner: string;
  createdAt: Date;
  resolvedAt?: Date;
  summary: string;
  escalationLevels?: string[];
}

export interface ToilItem {
  id: string;
  owner: string;
  hoursPerWeek: number;
  automated: boolean;
  hasRunbook: boolean;
  dryRunSupported: boolean;
  rollbackPlan: boolean;
  auditLogging: boolean;
}

export interface ToilBudgetConfig {
  weeklyHoursPerEngineer: number;
  budgetPercentage: number;
}

export interface Alert {
  id: string;
  dedupKey: string;
  service: string;
  severity: "info" | "warning" | "critical";
  noiseScore: number;
  createdAt: Date;
}

export interface PreviewEnvironment {
  id: string;
  owner: string;
  createdAt: Date;
  ttlHours: number;
  lastActiveAt: Date;
}

export interface FlowMetrics {
  team: string;
  leadTimeDays: number;
  cycleTimeDays: number;
  wipCount: number;
  blockedTimeHours: number;
  reworkPercentage: number;
}

export interface WipLimitEnforcement {
  team: string;
  limit: number;
  currentWip: number;
  allowedToStart: boolean;
  reason?: string;
}

export interface GuardrailResult {
  ok: boolean;
  message?: string;
  severity?: "info" | "warning" | "block";
}

export interface CostEntry {
  service: string;
  tenant: string;
  amount: number;
  timestamp: Date;
}

export interface CostReport {
  byService: Record<string, number>;
  byTenant: Record<string, number>;
  total: number;
}
