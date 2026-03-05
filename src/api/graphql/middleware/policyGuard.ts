import { isRedlined } from '../../../agents/policies/redlines';
import { isIntentAllowedForProfile } from '../../../agents/policies/allowedUseMatrix';
import { classifyIntent } from '../../../agents/policies/intentClassifier';
import { emitAuditLog } from '../../../agents/policies/auditEmitter';
import { getTenantProfile } from '../../../agents/policies/profiles';
import { v4 as uuidv4 } from 'uuid';

/**
 * GraphQL Apollo resolver middleware that enforces runtime API boundaries.
 * Throws errors directly instead of modifying HTTP responses like the REST middleware.
 */
export const policyGuardResolver = async (
  resolve: any,
  root: any,
  args: any,
  context: any,
  info: any
) => {
  // Extract prompt from GraphQL arguments. Usually, the input variable is prompt/input/message
  const prompt = args?.prompt || args?.input?.prompt || args?.message || '';

  // Extract context-level variables
  const tenantId = context?.tenantId || 'unknown';
  const requestId = context?.requestId || uuidv4();

  if (!prompt || typeof prompt !== 'string') {
    // Proceed if no prompt argument exists in this specific resolver, assuming other middleware handles standard type checking
    // Or, for stricter deny-by-default, throw an error if this wrapper is applied globally.
    // For this demonstration, we'll continue execution if no prompt is found to avoid breaking unrelated resolvers.
    return resolve(root, args, context, info);
  }

  const intent = classifyIntent(prompt);
  const profile = getTenantProfile(tenantId);

  // 1. Mandatory Vendor-level Redline Check (Overrides all tenant settings)
  if (isRedlined(intent)) {
    emitAuditLog({
      requestId,
      profile,
      intent,
      action: 'REDLINE_VIOLATION',
      rawPrompt: prompt,
    });
    throw new Error('POLICY_VIOLATION_REDLINE: Request blocked. Intent violates immutable vendor safety redlines.');
  }

  // 2. Tenant Profile Matrix Check
  if (!isIntentAllowedForProfile(intent, profile)) {
    emitAuditLog({
      requestId,
      profile,
      intent,
      action: 'DENIED',
      rawPrompt: prompt,
    });
    throw new Error(`POLICY_VIOLATION_PROFILE: Request blocked. Intent '${intent}' is not permitted under tenant profile '${profile}'.`);
  }

  // 3. Allowed, emit audit and proceed
  emitAuditLog({
    requestId,
    profile,
    intent,
    action: 'ALLOWED',
    rawPrompt: prompt,
  });

  // Attach metadata to context for downstream resolvers
  context.aiGovernance = {
    profile,
    intent,
    audited: true,
  };

  return resolve(root, args, context, info);
};
