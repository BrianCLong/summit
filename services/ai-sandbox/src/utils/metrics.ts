import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const registry = new Registry();

registry.setDefaultLabels({
  service: 'ai-sandbox',
});

export const metrics = {
  experimentsSubmitted: new Counter({
    name: 'ai_sandbox_experiments_submitted_total',
    help: 'Total number of experiments submitted',
    registers: [registry],
  }),

  experimentsCompleted: new Counter({
    name: 'ai_sandbox_experiments_completed_total',
    help: 'Total number of experiments completed',
    labelNames: ['status'],
    registers: [registry],
  }),

  experimentDuration: new Histogram({
    name: 'ai_sandbox_experiment_duration_ms',
    help: 'Duration of experiment execution in milliseconds',
    buckets: [100, 500, 1000, 5000, 10000, 30000, 60000],
    registers: [registry],
  }),

  queueDepth: new Gauge({
    name: 'ai_sandbox_queue_depth',
    help: 'Current number of experiments in queue',
    labelNames: ['state'],
    registers: [registry],
  }),

  policyViolations: new Counter({
    name: 'ai_sandbox_policy_violations_total',
    help: 'Total number of policy violations detected',
    labelNames: ['framework', 'severity'],
    registers: [registry],
  }),

  sandboxExecutions: new Counter({
    name: 'ai_sandbox_executions_total',
    help: 'Total sandbox code executions',
    labelNames: ['status'],
    registers: [registry],
  }),
};
