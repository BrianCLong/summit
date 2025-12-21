import { Histogram } from 'prom-client';
import { trace } from '@opentelemetry/api';
import { opaClient as defaultOPAClient } from '../services/opa-client';
import { logger } from '../utils/logger';
import { recordPolicyAudit } from './policyAudit';
import { AgentTask } from './maestro';

export type TaskActionType = 'READ' | 'WRITE' | 'DEPLOY' | 'OTHER';

export interface TaskPolicyInput {
  subject: {
    id?: string;
    roles?: string[];
    tenant?: string;
  };
  action: {
    type: TaskActionType | string;
    resource: string;
    parameters: Record<string, any>;
    reason_for_access?: string;
  };
  environment: {
    stage: string;
    request_id: string;
    change_request_id?: string;
  };
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  policyVersion: string;
  latencyMs: number;
  raw?: any;
}

const policyLatency = new Histogram({
  name: 'maestro_policy_eval_ms',
  help: 'OPA policy evaluation latency for orchestrator tasks',
  buckets: [1, 5, 10, 15, 20, 25, 50, 100],
});

export class TaskPolicyGate {
  constructor(private readonly opaClient = defaultOPAClient) {}

  async evaluate(task: AgentTask, action: TaskActionType): Promise<PolicyDecision> {
    const tracer = trace.getTracer('maestro.policy');
    const start = Date.now();
    const input = buildPolicyInput(task, action);

    return tracer.startActiveSpan('maestro.opa.evaluate', async (span) => {
      span.setAttributes({
        'policy.action': action,
        'policy.repo': task.repo,
      });

      try {
        const result = await this.opaClient.evaluateQuery(
          'orchestrator/policy/decision',
          input,
        );

        const decision = normalizeDecision(result, start);
        span.setAttributes({
          'policy.allowed': decision.allowed,
          'policy.reason': decision.reason,
          'policy.version': decision.policyVersion,
          'policy.latency_ms': decision.latencyMs,
        });
        span.end();

        recordPolicyAudit({
          taskId: (task as any).id,
          action,
          repo: task.repo,
          allowed: decision.allowed,
          reason: decision.reason,
          policyVersion: decision.policyVersion,
          actor: task.metadata?.actor,
          environment: task.context?.environment || process.env.NODE_ENV,
          latencyMs: decision.latencyMs,
          timestamp: new Date().toISOString(),
          reasonForAccess: resolveReasonForAccess(task),
        });

        if (decision.latencyMs > 25) {
          logger.warn('OPA policy evaluation exceeded latency target', {
            latencyMs: decision.latencyMs,
            action,
            repo: task.repo,
          });
        }

        logger.info('OPA policy decision evaluated', {
          action,
          allow: decision.allowed,
          reason: decision.reason,
          policyVersion: decision.policyVersion,
          latencyMs: decision.latencyMs,
        });

        return decision;
      } catch (error: any) {
        span.recordException(error);
        span.end();
        const latencyMs = Date.now() - start;
        policyLatency.observe(latencyMs);

        logger.error('OPA policy evaluation failed; failing closed', {
          error: error?.message,
          action,
          repo: task.repo,
          latencyMs,
        });

        const decision: PolicyDecision = {
          allowed: false,
          reason: 'OPA evaluation failure',
          policyVersion: 'unknown',
          latencyMs,
        };

        recordPolicyAudit({
          taskId: (task as any).id,
          action,
          repo: task.repo,
          allowed: decision.allowed,
          reason: decision.reason,
          policyVersion: decision.policyVersion,
          actor: task.metadata?.actor,
          environment: task.context?.environment || process.env.NODE_ENV,
          latencyMs,
          timestamp: new Date().toISOString(),
          reasonForAccess: resolveReasonForAccess(task),
        });

        return decision;
      }
    });
  }
}

export function buildPolicyInput(
  task: AgentTask,
  action: TaskActionType,
): TaskPolicyInput {
  const reasonForAccess = resolveReasonForAccess(task);
  const environment = task.context?.environment || process.env.NODE_ENV || 'development';

  return {
    subject: {
      id: task.metadata?.actor,
      roles: task.context?.roles,
      tenant: task.context?.tenant,
    },
    action: {
      type: action,
      resource: task.repo,
      parameters: {
        ...task.context,
        issue: task.issue,
        budgetUSD: task.budgetUSD,
      },
      reason_for_access: reasonForAccess,
    },
    environment: {
      stage: environment,
      request_id: task.metadata?.timestamp || `${Date.now()}`,
      change_request_id: task.context?.change_request_id,
    },
  };
}

export function normalizeDecision(result: any, start: number): PolicyDecision {
  const latencyMs = Date.now() - start;
  policyLatency.observe(latencyMs);

  const policyVersion = result?.policy_version || result?.decision?.policy_version || 'unknown';
  const allow = result?.allow ?? result?.decision?.allow ?? false;
  const reason = result?.reason ?? result?.decision?.reason ?? 'denied';

  return {
    allowed: Boolean(allow),
    reason: typeof reason === 'string' ? reason : Array.isArray(reason) ? reason[0] : 'denied',
    policyVersion,
    latencyMs,
    raw: result,
  };
}

export function deriveActionType(task: AgentTask): TaskActionType {
  if (task.action) {
    return task.action as TaskActionType;
  }

  switch (task.kind) {
    case 'implement':
    case 'scaffold':
    case 'docs':
      return 'WRITE';
    case 'review':
    case 'plan':
    case 'test':
      return 'READ';
    default:
      return 'OTHER';
  }
}

function resolveReasonForAccess(task: AgentTask): string | undefined {
  return (
    task.reasonForAccess ||
    (task.context as any)?.reasonForAccess ||
    (task.context as any)?.reason_for_access
  );
}
