import { Request, Response } from 'express';
import { PolicyEngine, PolicyContext, PolicyEffect } from './PolicyEngine.js';
import { provenanceLedger } from '../provenance/ledger.js';
import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

// Simple in-memory anomaly tracker
class AnomalyTracker extends EventEmitter {
    private accessLog: Map<string, number[]> = new Map();
    private readonly WINDOW_MS = 60000; // 1 minute
    private readonly THRESHOLD = 5; // 5 denials per minute

    public trackDenial(userId: string) {
        const now = Date.now();
        const timestamps = this.accessLog.get(userId) || [];

        // Filter out old timestamps
        const validTimestamps = timestamps.filter(t => now - t < this.WINDOW_MS);
        validTimestamps.push(now);
        this.accessLog.set(userId, validTimestamps);

        if (validTimestamps.length >= this.THRESHOLD) {
            this.emit('anomaly', { userId, count: validTimestamps.length, type: 'EXCESSIVE_DENIALS' });
        }
    }
}

export const anomalyTracker = new AnomalyTracker();

anomalyTracker.on('anomaly', async (data) => {
    logger.warn('Security Anomaly Detected:', data);
    // Log to ledger
    try {
         await provenanceLedger.appendEntry({
            tenantId: 'system',
            actionType: 'SECURITY_ALERT',
            resourceType: 'user',
            resourceId: data.userId,
            actorId: 'system-anomaly-detector',
            actorType: 'system',
            payload: data,
            metadata: { severity: 'HIGH' },
            timestamp: new Date()
        });
    } catch (e) {
        logger.error('Failed to log anomaly to ledger', e);
    }
});

export class GovernanceService {
  private policyEngine: PolicyEngine;

  constructor() {
    this.policyEngine = PolicyEngine.getInstance();
  }

  /**
   * Evaluates a policy request and logs the access attempt.
   */
  public async authorize(req: Request, res: Response) {
    try {
      const { subject, resource, action, environment, warrant } = req.body;

      if (!subject || !resource || !action) {
        return res.status(400).json({ error: 'Missing required fields: subject, resource, action' });
      }

      const context: PolicyContext = {
        subject,
        resource,
        action,
        environment: environment || { time: new Date() },
        warrant
      };

      const decision = this.policyEngine.evaluate(context);

      if (decision.effect === PolicyEffect.DENY) {
          anomalyTracker.trackDenial(subject.id);
      }

      // Log to Immutable Audit Ledger
      await provenanceLedger.appendEntry({
        tenantId: subject.tenantId || 'unknown',
        actionType: 'POLICY_EVALUATION',
        resourceType: resource.type,
        resourceId: resource.id || 'unknown',
        actorId: subject.id,
        actorType: 'user', // Simplified
        payload: {
          request: req.body,
          decision
        },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          warrantId: warrant?.id,
          authority: warrant?.authority
        },
        timestamp: new Date()
      });

      res.json(decision);
    } catch (error) {
      logger.error('Governance Service Error (authorize):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Simulates a policy evaluation (Dry Run) - Explainability
   */
  public async simulatePolicy(req: Request, res: Response) {
    try {
      const { subject, resource, action, environment, warrant } = req.body;
       const context: PolicyContext = {
        subject,
        resource,
        action,
        environment: environment || { time: new Date() },
        warrant
      };

      const result = this.policyEngine.dryRun(context);
      res.json(result);
    } catch (error) {
       logger.error('Governance Service Error (simulate):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Explicitly logs an access event (e.g., post-action confirmation)
   */
  public async logAccess(req: Request, res: Response) {
    try {
       const { tenantId, actor, action, resource, metadata, warrant } = req.body;

       const entry = await provenanceLedger.appendEntry({
        tenantId: tenantId,
        actionType: action,
        resourceType: resource.type,
        resourceId: resource.id,
        actorId: actor.id,
        actorType: actor.type || 'user',
        payload: { metadata },
        metadata: {
          ...metadata,
          warrantId: warrant?.id,
          authority: warrant?.authority
        },
        timestamp: new Date()
      });

      res.json({ success: true, entryId: entry.id, hash: entry.currentHash });
    } catch (error) {
       logger.error('Governance Service Error (logAccess):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Provides a human-readable explanation for a denial
   */
  public async reasonDenial(req: Request, res: Response) {
    // This is essentially a specialized view of simulatePolicy
     try {
      const { subject, resource, action, environment, warrant } = req.body;
       const context: PolicyContext = {
        subject,
        resource,
        action,
        environment: environment || { time: new Date() },
        warrant
      };

      const result = this.policyEngine.dryRun(context);

      if (result.effect === PolicyEffect.ALLOW) {
          return res.json({ message: 'Action is allowed.', trace: result.trace });
      }

      // Generate human readable explanation
      const explanation = `Access Denied. ${result.reason}. Policy '${result.policyId}' matched with DENY effect.`;

      res.json({
          explanation,
          reason: result.reason,
          policyId: result.policyId,
          trace: result.trace
      });

    } catch (error) {
       logger.error('Governance Service Error (reasonDenial):', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
