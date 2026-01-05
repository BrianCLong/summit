import { Request, Response, NextFunction } from 'express';
import { emitAudit } from '@intelgraph/audit/index';
import { trace } from '@opentelemetry/api';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// --- CONFIGURATION ---

// Route Classification Map (Security Hardening)
// Maps URL regex patterns to resource classification and type.
// In a real gateway, this would come from the service catalog or route config.
const ROUTE_CONFIG: Record<string, { classification: string, type: string }> = {
  '^/api/reports/restricted/.*': { classification: 'restricted', type: 'report' },
  '^/api/reports/confidential/.*': { classification: 'confidential', type: 'report' },
  '^/api/admin/.*': { classification: 'restricted', type: 'admin_panel' },
  '^/api/export/.*': { classification: 'restricted', type: 'dataset' },
  '^/api/users/impersonate': { classification: 'restricted', type: 'identity' },
  '.*': { classification: 'public', type: 'general' } // Default Fallback
};

// --- POLICY LOADING ---

let RFA_MATRIX: any[] = [];

// Load policy matrix at startup
try {
  const matrixPath = path.resolve(process.cwd(), 'audit/policy/rfa_matrix.yaml');
  if (fs.existsSync(matrixPath)) {
    const fileContent = fs.readFileSync(matrixPath, 'utf-8');
    const doc = yaml.load(fileContent) as any;
    if (doc && doc.policies) {
      RFA_MATRIX = doc.policies;
      console.log("RFA Policy Matrix loaded successfully.");
    } else {
      console.warn("RFA Policy Matrix file found but invalid format.");
    }
  } else {
    console.warn("RFA Policy Matrix file not found at " + matrixPath);
  }
} catch (e) {
  console.error("Failed to load RFA Policy Matrix", e);
  // Fail closed or default to secure?
  // We will leave RFA_MATRIX empty, which means no specific policies match,
  // BUT we should probably have safe defaults.
}

// --- LOGIC ---

// Helper to determine resource context securely from route
const determineResourceContext = (req: Request) => {
  const p = req.path;
  for (const [pattern, config] of Object.entries(ROUTE_CONFIG)) {
    if (new RegExp(pattern).test(p)) {
      // For ID, we might extract from params, but for classification the pattern is enough
      return {
        type: config.type,
        id: req.params.id || 'unknown', // Express params might not be populated in this global middleware depending on mounting
        classification: config.classification
      };
    }
  }
  return { type: 'unknown', id: 'unknown', classification: 'public' };
};

// Helper to derive action from request
const deriveAction = (req: Request): string => {
  const method = req.method.toUpperCase();
  const p = req.path;

  if (p.includes('/export')) return 'export';
  if (p.includes('/impersonate')) return 'impersonate';
  if (method === 'DELETE') return 'delete';
  if (method === 'GET') return 'read';

  return 'read';
};

// Generic Policy Evaluator (Simulating OPA based on loaded YAML)
const evaluatePolicy = async (user: any, action: string, resource: any) => {
  const obligations = {
    require_rfa: false,
    require_step_up: false,
    rfa_fields: [] as string[],
    min_reason_len: 0
  };

  // Default denials if matrix failed to load?
  // For MVP we proceed with loaded matrix.

  for (const rule of RFA_MATRIX) {
    const actionMatch = rule.action === action || rule.action === '*';
    const classMatch = rule.classification === resource.classification || rule.classification === '*';
    const roleMatch = rule.role === '*' || user.roles.includes(rule.role);

    if (actionMatch && classMatch && roleMatch) {
      const reqs = rule.requirements;
      if (reqs.rfa_required) obligations.require_rfa = true;
      if (reqs.step_up_required) obligations.require_step_up = true;
      if (reqs.min_reason_len > obligations.min_reason_len) obligations.min_reason_len = reqs.min_reason_len;

      if (reqs.ticket_required && !obligations.rfa_fields.includes('ticket')) {
        obligations.rfa_fields.push('ticket');
      }
    }
  }

  if (obligations.require_rfa && !obligations.rfa_fields.includes('reason')) {
    obligations.rfa_fields.push('reason');
  }

  return obligations;
};

export const auditRfaMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const tracer = trace.getTracer('gateway');
  const span = tracer.startSpan('audit_rfa_check');

  try {
    const user = (req as any).user || { id: 'anonymous', roles: [] };

    const action = deriveAction(req);
    const resource = determineResourceContext(req);

    const obligations = await evaluatePolicy(user, action, resource);

    if (obligations.require_rfa) {
      const rfaReason = req.headers['x-rfa-reason'] as string;
      const rfaTicket = req.headers['x-rfa-ticket'] as string;

      if (!rfaReason) {
        res.status(403).json({
          error: 'RFA_REQUIRED',
          message: 'Reason for access is required',
          obligations
        });
        span.end();
        return;
      }

      if (rfaReason.length < obligations.min_reason_len) {
        res.status(403).json({
          error: 'RFA_INVALID',
          message: `Reason must be at least ${obligations.min_reason_len} characters`,
          obligations
        });
        span.end();
        return;
      }

      if (obligations.rfa_fields.includes('ticket') && !rfaTicket) {
        res.status(403).json({
          error: 'RFA_TICKET_REQUIRED',
          message: 'JIRA Ticket is required for this action',
          obligations
        });
        span.end();
        return;
      }
    }

    if (obligations.require_step_up) {
      const stepUpToken = req.headers['x-step-up-token'];
      if (!stepUpToken) {
        res.status(401).json({
          error: 'STEP_UP_REQUIRED',
          message: 'MFA Step-Up required',
          obligations
        });
        span.end();
        return;
      }
    }

    // Capture response for audit outcome
    const originalSend = res.send;
    const start = Date.now();

    res.send = function (body) {
      const latency = Date.now() - start;

      // Emit Audit Event on completion
      emitAudit({
        action: action as any,
        actor: {
          id: user.id,
          type: 'user',
          roles: user.roles,
          mfa: user.mfa_method
        },
        tenant: (req as any).tenantId || 'default',
        resource: resource as any,
        rfa: obligations.require_rfa ? {
          required: true,
          reason: req.headers['x-rfa-reason'] as string,
          ticket: req.headers['x-rfa-ticket'] as string
        } : undefined,
        authz: {
          decision: 'allow',
          policy_bundle: 'v1.0.0'
        },
        request: {
          ip: req.ip || 'unknown',
          ua: req.headers['user-agent'] || 'unknown',
          method: req.method,
          route: req.path
        },
        outcome: {
          status: res.statusCode >= 400 ? 'failure' : 'success',
          http: res.statusCode,
          latency_ms: latency
        }
      }).catch(err => console.error("Audit Emit Failed", err));

      return originalSend.call(this, body);
    };

    next();
  } catch (err) {
    span.recordException(err as Error);
    next(err);
  } finally {
    span.end();
  }
};
