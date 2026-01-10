export type QuotaPolicyReason =
  | 'concurrent_runs_exceeded'
  | 'step_throughput_exceeded'
  | 'receipt_backlog_exceeded';

export type QuotaPolicyRuleKey =
  | 'concurrentRuns'
  | 'stepThroughput'
  | 'receiptBacklog';

export type QuotaPolicyRule = {
  id: string;
  description: string;
  reason: QuotaPolicyReason;
  resource: string;
};

export const quotaPolicyRules: Record<QuotaPolicyRuleKey, QuotaPolicyRule> = {
  concurrentRuns: {
    id: 'quota.concurrent_runs',
    description: 'Limit the number of concurrent runs per tenant.',
    reason: 'concurrent_runs_exceeded',
    resource: 'maestro.run',
  },
  stepThroughput: {
    id: 'quota.step_throughput',
    description: 'Limit step throughput per tenant per minute.',
    reason: 'step_throughput_exceeded',
    resource: 'maestro.step',
  },
  receiptBacklog: {
    id: 'quota.receipt_backlog',
    description: 'Limit in-flight receipt backlog per tenant.',
    reason: 'receipt_backlog_exceeded',
    resource: 'receipt',
  },
};

export type QuotaPolicyDecision = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  reason?: QuotaPolicyReason;
  retryAfterMs?: number;
};

export class QuotaPolicyError extends Error {
  readonly rule: QuotaPolicyRule;
  readonly decision: QuotaPolicyDecision;
  receipt?: unknown;

  constructor(
    message: string,
    rule: QuotaPolicyRule,
    decision: QuotaPolicyDecision,
  ) {
    super(message);
    this.name = 'QuotaPolicyError';
    this.rule = rule;
    this.decision = decision;
  }
}
