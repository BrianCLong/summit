/**
 * OPA Policy-Enabled Job Wrapper
 *
 * Part of Shai-Hulud supply chain security initiative.
 * This wrapper ensures background jobs are subject to OPA policy checks,
 * preventing authorization bypass via async job execution.
 *
 * Usage:
 *   import { withOpaPolicy } from './opa-job-wrapper.js';
 *
 *   export const myProcessor = withOpaPolicy('my_queue', async (job, policyContext) => {
 *     // Your job logic here
 *     // policyContext contains the OPA decision if enabled
 *   });
 */

import { Job } from 'bullmq';
import logger from '../../utils/logger.js';

// Policy check configuration
const OPA_URL = process.env.OPA_URL ?? 'http://localhost:8181';
const OPA_ENABLED = process.env.OPA_JOBS_ENABLED !== 'false';
const OPA_TIMEOUT_MS = parseInt(process.env.OPA_JOB_TIMEOUT_MS ?? '5000', 10);
const FAIL_CLOSED = process.env.NODE_ENV === 'production';

export interface JobPolicyContext {
  allow: boolean;
  reason?: string;
  obligations?: string[];
  evaluatedAt: string;
}

interface JobMetadata {
  userId?: string;
  tenantId?: string;
  action?: string;
  resource?: string;
  [key: string]: unknown;
}

/**
 * Evaluates OPA policy for a job before execution.
 */
async function evaluateJobPolicy(
  queueName: string,
  job: Job,
): Promise<JobPolicyContext> {
  if (!OPA_ENABLED) {
    return {
      allow: true,
      reason: 'OPA disabled for jobs',
      evaluatedAt: new Date().toISOString(),
    };
  }

  const metadata = (job.data as JobMetadata) ?? {};

  const input = {
    queue: queueName,
    job_id: job.id,
    job_name: job.name,
    attempt: job.attemptsMade,
    user_id: metadata.userId ?? 'system',
    tenant_id: metadata.tenantId ?? 'default',
    action: metadata.action ?? `job:${queueName}`,
    resource: metadata.resource ?? queueName,
    timestamp: new Date().toISOString(),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPA_TIMEOUT_MS);

    const response = await fetch(`${OPA_URL}/v1/data/summit/jobs/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OPA returned ${response.status}`);
    }

    const result = await response.json();
    const decision = result.result ?? { allow: false };

    logPolicyDecision(queueName, job, decision);

    return {
      allow: decision.allow ?? false,
      reason: decision.reason,
      obligations: decision.obligations,
      evaluatedAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('OPA job policy evaluation failed', {
      queue: queueName,
      jobId: job.id,
      error: errorMessage,
      failClosed: FAIL_CLOSED,
    });

    if (FAIL_CLOSED) {
      return {
        allow: false,
        reason: `Policy evaluation failed: ${errorMessage}`,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Non-production: allow with warning
    logger.warn('Non-production: allowing job despite policy error', {
      queue: queueName,
      jobId: job.id,
    });

    return {
      allow: true,
      reason: 'Policy error - allowed in non-production',
      evaluatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Logs policy decisions for audit trail.
 */
function logPolicyDecision(
  queueName: string,
  job: Job,
  decision: { allow: boolean; reason?: string },
): void {
  const metadata = (job.data as JobMetadata) ?? {};

  const logEntry = {
    type: 'job_policy_decision',
    timestamp: new Date().toISOString(),
    queue: queueName,
    job_id: job.id,
    job_name: job.name,
    user_id: metadata.userId ?? 'system',
    tenant_id: metadata.tenantId ?? 'default',
    decision: decision.allow ? 'allow' : 'deny',
    reason: decision.reason,
  };

  if (decision.allow) {
    logger.info('Job policy decision: ALLOW', logEntry);
  } else {
    logger.warn('Job policy decision: DENY', logEntry);
  }
}

/**
 * Wraps a job processor with OPA policy checks.
 *
 * @param queueName - The name of the queue (used for policy matching)
 * @param processor - The original job processor function
 * @returns A wrapped processor that checks policy before execution
 */
export function withOpaPolicy<T = unknown, R = unknown>(
  queueName: string,
  processor: (job: Job<T>, policyContext: JobPolicyContext) => Promise<R>,
): (job: Job<T>) => Promise<R> {
  return async (job: Job<T>): Promise<R> => {
    const policyContext = await evaluateJobPolicy(queueName, job as Job);

    if (!policyContext.allow) {
      logger.warn('Job blocked by OPA policy', {
        queue: queueName,
        jobId: job.id,
        reason: policyContext.reason,
      });

      // Throw error to fail the job (BullMQ will handle retries/DLQ)
      throw new Error(`JOB_POLICY_DENIED: ${policyContext.reason ?? 'Access denied by policy'}`);
    }

    // Execute the original processor and return its result
    return processor(job, policyContext);
  };
}

/**
 * Check if a job should be allowed to run (for use during job enqueue).
 * This can be called before adding a job to the queue to pre-validate.
 */
export async function canEnqueueJob(
  queueName: string,
  jobData: JobMetadata,
): Promise<{ allowed: boolean; reason?: string }> {
  if (!OPA_ENABLED) {
    return { allowed: true };
  }

  const mockJob = {
    id: 'pre-enqueue-check',
    name: queueName,
    data: jobData,
    attemptsMade: 0,
  } as Job;

  const result = await evaluateJobPolicy(queueName, mockJob);

  return {
    allowed: result.allow,
    reason: result.reason,
  };
}
