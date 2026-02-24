/**
 * Policy Preflight Runner
 *
 * Evaluates tool invocation requests against the per-environment
 * allowlist. Deny-by-default: no tool execution path exists without
 * verdict = ALLOW. Every invocation produces an evidence bundle.
 */

import {
  PolicyPreflightRequestSchema,
  PolicyPreflightResponseSchema,
  type PolicyPreflightRequest,
  type PolicyPreflightResponse,
  type PolicyReason,
  type PolicyVerdict,
} from './types.js';
import { isToolAllowed, getAllowedTools } from './tool-allowlist.js';
import { emitEvidenceBundle } from './evidence.js';
import logger from '../config/logger.js';

const preflightLogger = logger.child({ name: 'PolicyPreflight' });

/**
 * Run the policy preflight check for a set of tools in a given environment.
 *
 * INVARIANT: The overall verdict is ALLOW only if ALL requested tools
 * are in the environment's allowlist. A single denial causes overall DENY.
 */
export async function runPolicyPreflight(
  raw: unknown,
): Promise<PolicyPreflightResponse> {
  // Validate input — throws ZodError on invalid data
  const request = PolicyPreflightRequestSchema.parse(raw);

  const reasons: PolicyReason[] = [];
  const allowedTools: string[] = [];
  const deniedTools: string[] = [];

  // Evaluate each tool against the allowlist
  for (const toolId of request.tools) {
    const allowed = await isToolAllowed(request.environment, toolId);
    if (allowed) {
      allowedTools.push(toolId);
      reasons.push({
        tool: toolId,
        verdict: 'ALLOW',
        reason: `Tool "${toolId}" is in the ${request.environment} allowlist`,
      });
    } else {
      deniedTools.push(toolId);
      reasons.push({
        tool: toolId,
        verdict: 'DENY',
        reason: `Tool "${toolId}" is not in the ${request.environment} allowlist (deny-by-default)`,
      });
    }
  }

  // Overall verdict: ALLOW only if zero denials
  const verdict: PolicyVerdict = deniedTools.length === 0 ? 'ALLOW' : 'DENY';
  const timestamp = new Date().toISOString();

  // Emit evidence bundle
  const evidence = await emitEvidenceBundle({
    actor: request.actor ?? 'unknown',
    action: 'policy_preflight',
    inputs: {
      environment: request.environment,
      tools: request.tools,
      rationale: request.rationale,
    },
    outputs: {
      verdict,
      allowedTools,
      deniedTools,
      reasons,
    },
    policyDecision: verdict,
    environment: request.environment,
    details: {
      dryRun: request.dryRun,
      requestedToolCount: request.tools.length,
      allowedToolCount: allowedTools.length,
      deniedToolCount: deniedTools.length,
    },
  });

  const response: PolicyPreflightResponse = {
    verdict,
    reasons,
    evidenceId: evidence.id,
    timestamp,
    environment: request.environment,
    requestedTools: request.tools,
    allowedTools,
    deniedTools,
    dryRun: request.dryRun,
  };

  // Validate output contract
  PolicyPreflightResponseSchema.parse(response);

  preflightLogger.info(
    {
      verdict,
      environment: request.environment,
      toolCount: request.tools.length,
      deniedCount: deniedTools.length,
      evidenceId: evidence.id,
    },
    'Policy preflight completed',
  );

  return response;
}
