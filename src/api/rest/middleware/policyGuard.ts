import { Request, Response, NextFunction } from 'express';
import { classifyIntent } from '../../../agents/policies/intentClassifier.js';
import { isRedline } from '../../../agents/policies/redlines.js';
import { emitAuditLog, AuditLogEntry } from '../../../agents/policies/auditEmitter.js';
import { InferenceProfile, isAllowedUse } from '../../../agents/policies/allowedUseMatrix.js';

export const policyGuard = (profile: InferenceProfile = 'civilian_safe') => {
  return async (req: Request, res: Response, next: NextFunction) => {
      const prompt = req.body.prompt;
      const userId = req.headers['x-user-id'] as string || 'anonymous';
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      if (!prompt) return next();
      try {
          const classification = await classifyIntent(prompt);
          const auditEntry: AuditLogEntry = {
              timestamp: new Date().toISOString(),
              userId,
              requestId,
              action: 'inference_request',
              intentClassification: classification,
              details: { profile, prompt: prompt.substring(0, 100) + '...' },
              status: 'allowed'
          };
          if (isRedline(classification.intent) || classification.isRedline) {
              auditEntry.status = 'denied';
              emitAuditLog(auditEntry);
              return res.status(403).json({ error: 'Request denied due to policy violation (redline).' });
          }
          if (!isAllowedUse(profile, classification.intent) && classification.intent !== 'general_inquiry') {
              auditEntry.status = 'flagged';
              emitAuditLog(auditEntry);
              return res.status(403).json({ error: 'Request denied: intent not permitted for the current inference profile.' });
          }
          auditEntry.status = 'allowed';
          emitAuditLog(auditEntry);
          next();
      } catch (error) {
          console.error("Policy enforcement error:", error);
          res.status(500).json({ error: 'Internal server error during policy check.' });
      }
  };
};
