import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Histogram } from 'prom-client';

// Lazy load dependencies to avoid side-effects during testing
let ProvenanceLedgerV2: any;
let opaAllow: any;
let advancedAuditSystem: any;
let telemetry: any;

const guardrailsLatency = new Histogram({
  name: 'guardrails_enforcement_duration_seconds',
  help: 'Duration of guardrails enforcement in seconds',
  labelNames: ['status', 'action'],
});

const PROVENANCE_HEADER = 'x-summit-provenance-id';
const POLICY_HEADER = 'x-summit-policy-decision';
const APPROVAL_HEADER = 'x-summit-approval-receipt';

// Dependencies interface for injection
interface GuardrailsDependencies {
    opaAllow: (path: string, input: any, options: any) => Promise<any>;
    appendProvenanceEntry: (entry: any) => Promise<any>;
    logAudit: (event: any) => Promise<void>;
    recordMetric: (status: string, action: string, duration: number) => void;
    recordDenial: () => void;
}

// Default implementation using dynamic imports
const getDefaultDependencies = async (): Promise<GuardrailsDependencies> => {
    if (!ProvenanceLedgerV2) {
        ProvenanceLedgerV2 = (await import('../provenance/ledger.js')).ProvenanceLedgerV2;
    }
    if (!opaAllow) {
        opaAllow = (await import('../policy/opaClient.js')).opaAllow;
    }
    if (!advancedAuditSystem) {
        advancedAuditSystem = (await import('../audit/advanced-audit-system.js')).advancedAuditSystem;
    }
    if (!telemetry) {
        telemetry = (await import('../lib/telemetry/comprehensive-telemetry.js')).telemetry;
    }

    return {
        opaAllow,
        appendProvenanceEntry: (entry) => ProvenanceLedgerV2.getInstance().appendEntry(entry),
        logAudit: async (event) => {
            if ((advancedAuditSystem as any).logEvent) {
                 await (advancedAuditSystem as any).logEvent(event);
            }
        },
        recordMetric: (status, action, duration) => {
            guardrailsLatency.observe({ status, action }, duration);
        },
        recordDenial: () => {
            telemetry.subsystems.policy.denials.add();
        }
    };
};

export const createGuardrailsMiddleware = (depsPromise?: Promise<GuardrailsDependencies> | GuardrailsDependencies) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      // 1. Identify Write Operations
      const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      if (!isWrite) {
        return next();
      }

      // Resolve dependencies
      const deps = depsPromise ? (await Promise.resolve(depsPromise)) : (await getDefaultDependencies());

      const start = Date.now();
      const requestId = (req as any).id || uuidv4();
      const tenantId = (req as any).user?.tenant_id || (req as any).tenantId || 'unknown';
      const userId = (req as any).user?.id || (req as any).user?.sub || 'anonymous';
      const action = `${req.method}:${req.route?.path || req.path}`;
      const resource = req.originalUrl;

      try {
        // 2. Identify Policy
        const policyPath = getPolicyPathForRoute(req.path);

        // Deny by default if unmapped
        if (!policyPath) {
             deps.recordDenial();
             deps.recordMetric('deny_unmapped', action, (Date.now() - start) / 1000);
             console.warn(`[Guardrails] Blocked unmapped write operation: ${action}`);
             return res.status(403).json({
                error: 'Policy Violation',
                message: 'Operation not explicitly mapped to a security policy.',
                requestId
             });
        }

        // 3. Policy Preflight (OPA)
        const input: any = {
          action,
          tenant: tenantId,
          user: (req as any).user,
          resource,
          approval_receipt: req.headers[APPROVAL_HEADER], // Dual-control evidence
          meta: {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            requestId,
          },
        };

        const decision = await deps.opaAllow(policyPath, input, {
            timeoutMs: 1000, // Strict timeout for critical path
            failOpen: false // Security first
        });

        if (!decision.allow) {
          deps.recordDenial();
          deps.recordMetric('deny', action, (Date.now() - start) / 1000);

          // Audit the denial
          await deps.logAudit({
             eventType: 'policy_enforcement',
             tenantId,
             userId,
             action,
             resourceType: 'api',
             resourceId: resource,
             outcome: 'failure',
             details: {
                 requestId,
                 decision,
             },
             level: 'warn'
          });

          return res.status(403).json({
            error: 'Policy Violation',
            message: decision.reason || 'Access denied by policy enforcement',
            requestId,
            policy: policyPath
          });
        }

        // 4. Provenance Receipt
        const receipt = await deps.appendProvenanceEntry({
          tenantId,
          actorId: userId,
          actorType: 'user',
          actionType: action,
          resourceType: 'api_endpoint',
          resourceId: resource,
          payload: {
            method: req.method,
            path: req.path,
            requestId,
            policyDecision: decision
          },
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            correlationId: (req as any).correlationId,
          },
          timestamp: new Date()
        });

        // Attach headers
        res.setHeader(PROVENANCE_HEADER, receipt.id);
        res.setHeader(POLICY_HEADER, 'allow');

        // 5. Audit Log (Append-only)
        await deps.logAudit({
             eventType: 'policy_enforcement',
             tenantId,
             userId,
             action,
             resourceType: 'api',
             resourceId: resource,
             outcome: 'success',
             details: {
                 requestId,
                 decision,
                 provenanceId: receipt.id
             },
             level: 'info'
        });

        deps.recordMetric('allow', action, (Date.now() - start) / 1000);

        next();
      } catch (error) {
        console.error('Guardrails enforcement failed', error);
        // Fail closed
        res.status(500).json({
          error: 'Security Enforcement Error',
          message: 'Unable to verify policy and provenance',
          requestId
        });
      }
    };
}

export const guardrailsMiddleware = createGuardrailsMiddleware();

function getPolicyPathForRoute(path: string): string | null {
    // Inventory of Critical Write Paths
    // Privileged Operations
    if (path.startsWith('/api/billing')) return 'summit/billing';
    if (path.startsWith('/api/tenants')) return 'summit/tenants';
    if (path.startsWith('/api/secrets')) return 'summit/secrets';
    if (path.startsWith('/api/admin')) return 'summit/admin';
    if (path.startsWith('/api/policy')) return 'summit/policy';

    // Standard Operations (Temporary catch-all for GA MVP)
    // In a real system, we would map every single route.
    // For MVP-4 GA, we map broadly to ensure coverage.
    if (path.startsWith('/api/')) return 'main/allow';

    return null;
}
