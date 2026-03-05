import { Request, Response, NextFunction } from 'express';
import { isRedlined } from '../../../agents/policies/redlines';
import { isIntentAllowedForProfile } from '../../../agents/policies/allowedUseMatrix';
import { classifyIntent } from '../../../agents/policies/intentClassifier';
import { emitAuditLog } from '../../../agents/policies/auditEmitter';
import { getTenantProfile } from '../../../agents/policies/profiles';
import { v4 as uuidv4 } from 'uuid';

/**
 * Express middleware that enforces runtime API boundaries (The AI Control Plane).
 *
 * Flow:
 * 1. Extract intent from prompt payload.
 * 2. Classify intent.
 * 3. Evaluate immutable Vendor Redlines -> DENY if redlined.
 * 4. Fetch Tenant Capability Profile -> Evaluate allowed matrix.
 * 5. Emit cryptographic audit proof.
 * 6. Allow request to proceed if checks pass.
 *
 * This is designed to be "deny-by-default". If no specific allow condition is met, block.
 */
export const policyGuard = (req: Request, res: Response, next: NextFunction) => {
  const prompt = req.body?.prompt || req.query?.prompt || '';
  // Default tenant ID in absence of full auth extraction middleware in this example
  const tenantId = (req.headers['x-tenant-id'] as string) || 'unknown';
  const requestId = req.headers['x-request-id'] as string || uuidv4();

  if (!prompt || typeof prompt !== 'string') {
    // Cannot inspect, assume unsafe. Deny-by-default.
    return res.status(400).json({ error: 'Missing or invalid prompt payload. Policy evaluation failed.' });
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
    return res.status(403).json({
      error: 'Request blocked. Intent violates immutable vendor safety redlines.',
      code: 'POLICY_VIOLATION_REDLINE'
    });
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
    return res.status(403).json({
      error: `Request blocked. Intent '${intent}' is not permitted under tenant profile '${profile}'.`,
      code: 'POLICY_VIOLATION_PROFILE'
    });
  }

  // 3. Allowed, emit audit and proceed
  emitAuditLog({
    requestId,
    profile,
    intent,
    action: 'ALLOWED',
    rawPrompt: prompt,
  });

  // Attach metadata to request for downstream handlers if needed
  (req as any).aiGovernance = {
    profile,
    intent,
    audited: true,
  };

  next();
};
