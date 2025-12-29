import { PolicyEngine } from './PolicyEngine.js';
import { Policy, PolicyContext, GovernanceVerdict, Stage } from './types.js';
import { redactData } from '../utils/dataRedaction.js';

interface AttributeContext {
  id: string;
  role: string;
  tenantId: string;
  region?: string;
  allowedCases?: string[];
  exportControls?: {
    destinations: string[];
    defaultAction?: 'DENY' | 'WARN' | 'ALLOW';
  };
}

interface ExecutionRequest {
  stage: Stage;
  tenantId: string;
  payload: Record<string, any>;
  user: AttributeContext;
  caseId?: string;
  destinationCountry?: string;
  retentionDays?: number;
  simulation?: boolean;
}

interface OpaPolicy {
  id: string;
  description: string;
  stages: Stage[];
  evaluate: (input: Record<string, any>) => { allow: boolean; obligation?: string };
}

interface PolicyExecutionResult {
  action: GovernanceVerdict['action'];
  reasons: string[];
  governanceVerdict: GovernanceVerdict;
  opaDecisions: { id: string; allow: boolean; obligation?: string }[];
  piiFindings: string[];
  redactedPayload: Record<string, any>;
  retention?: { expiresAt: string; policyDays: number };
}

const PII_PATTERNS: Record<string, RegExp> = {
  email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  phone: /\b\+?\d[\d\s().-]{7,}\b/,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/,
};

const severityOrder: GovernanceVerdict['action'][] = ['ALLOW', 'WARN', 'ESCALATE', 'DENY'];

function compareSeverity(a: GovernanceVerdict['action'], b: GovernanceVerdict['action']) {
  return severityOrder.indexOf(a) - severityOrder.indexOf(b);
}

function mergeActions(actions: GovernanceVerdict['action'][]): GovernanceVerdict['action'] {
  return [...actions].sort(compareSeverity).pop() ?? 'ALLOW';
}

function detectPiiFields(payload: Record<string, any>, prefix: string[] = [], found: string[] = []): string[] {
  Object.entries(payload || {}).forEach(([key, value]) => {
    const path = [...prefix, key];
    if (typeof value === 'string') {
      for (const pattern of Object.values(PII_PATTERNS)) {
        if (pattern.test(value)) {
          found.push(path.join('.'));
          break;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      detectPiiFields(value as Record<string, any>, path, found);
    }
  });
  return found;
}

function maskDetectedFields(payload: Record<string, any>, paths: string[]) {
  for (const path of paths) {
    const segments = path.split('.');
    const last = segments.pop();
    if (!last) continue;

    let cursor: any = payload;
    for (const segment of segments) {
      if (cursor && typeof cursor === 'object' && segment in cursor) {
        cursor = cursor[segment];
      } else {
        cursor = undefined;
        break;
      }
    }

    if (cursor && typeof cursor === 'object' && last in cursor) {
      cursor[last] = '[REDACTED]';
    }
  }
}

function buildDefaultPolicies(): Policy[] {
  return [
    {
      id: 'ingest-pii-escalation',
      description: 'Escalate ingestion when PII detected',
      scope: { stages: ['ingest'], tenants: ['*'] },
      rules: [{ field: 'metadata.containsPii', operator: 'eq', value: true }],
      action: 'ESCALATE',
    },
    {
      id: 'retrieval-export-control',
      description: 'Deny retrieval when export controls fail',
      scope: { stages: ['retrieval'], tenants: ['*'] },
      rules: [{ field: 'metadata.exportPermitted', operator: 'eq', value: false }],
      action: 'DENY',
    },
    {
      id: 'tool-unsafe-deny',
      description: 'Deny unsafe tools for non-admins',
      scope: { stages: ['tool_use'], tenants: ['*'] },
      rules: [
        { field: 'tool', operator: 'in', value: ['system_shell', 'raw_sql'] },
        { field: 'userRole', operator: 'neq', value: 'admin' },
      ],
      action: 'DENY',
    },
    {
      id: 'output-pii-warning',
      description: 'Warn when PII leaves the system without case binding',
      scope: { stages: ['output'], tenants: ['*'] },
      rules: [
        { field: 'metadata.containsPii', operator: 'eq', value: true },
        { field: 'metadata.caseBound', operator: 'eq', value: false },
      ],
      action: 'WARN',
    },
  ];
}

function buildDefaultOpaPolicies(): OpaPolicy[] {
  return [
    {
      id: 'case-level-access',
      description: 'User must be authorized for the case to view or export data',
      stages: ['retrieval', 'output'],
      evaluate: (input) => {
        const authorizedCases = input.user?.allowedCases ?? [];
        if (!input.caseId) {
          return { allow: false, obligation: 'Case identifier is required' };
        }
        const allow = authorizedCases.includes(input.caseId);
        return {
          allow,
          obligation: allow
            ? undefined
            : 'User is not authorized for the requested case scope',
        };
      },
    },
    {
      id: 'export-control-destination',
      description: 'Destination must be explicitly permitted',
      stages: ['output', 'retrieval'],
      evaluate: (input) => {
        const destinations: string[] = input.user?.exportControls?.destinations ?? [];
        const destination = input.destinationCountry;
        const allow = destination ? destinations.includes(destination) : true;
        return {
          allow,
          obligation: allow ? undefined : 'Export destination not permitted for user',
        };
      },
    },
  ];
}

export class PolicyExecutionOrchestrator {
  private readonly policyEngine: PolicyEngine;
  private readonly opaPolicies: OpaPolicy[];

  constructor(options?: { policies?: Policy[]; opaPolicies?: OpaPolicy[] }) {
    this.policyEngine = new PolicyEngine(options?.policies ?? buildDefaultPolicies());
    this.opaPolicies = options?.opaPolicies ?? buildDefaultOpaPolicies();
  }

  evaluate(request: ExecutionRequest): PolicyExecutionResult {
    const payloadClone = JSON.parse(JSON.stringify(request.payload));
    const piiFindings = detectPiiFields(payloadClone);
    const redactedPayload = piiFindings.length
      ? (redactData(payloadClone, { id: request.user.id, role: request.user.role }) as Record<string, any>)
      : payloadClone;

    if (piiFindings.length) {
      maskDetectedFields(redactedPayload, piiFindings);
    }

    const exportPermitted = this.evaluateExportControl(request);

    const policyContext: PolicyContext = {
      stage: request.stage,
      tenantId: request.tenantId,
      region: request.user.region,
      payload: {
        ...redactedPayload,
        userRole: request.user.role,
      },
      metadata: {
        containsPii: piiFindings.length > 0,
        exportPermitted,
        caseBound: Boolean(request.caseId),
        retentionDays: request.retentionDays ?? 30,
      },
      simulation: request.simulation,
    };

    const governanceVerdict = this.policyEngine.check(policyContext);
    const opaDecisions = this.opaPolicies
      .filter((policy) => policy.stages.includes(request.stage))
      .map((policy) => {
        const decision = policy.evaluate({
          ...request.payload,
          user: request.user,
          caseId: request.caseId,
          destinationCountry: request.destinationCountry,
        });

        return {
          id: policy.id,
          allow: decision.allow,
          obligation: decision.obligation,
        };
      });

    const opaReasons = opaDecisions
      .filter((decision) => !decision.allow)
      .map((decision) => `${decision.id}: ${decision.obligation || 'not allowed'}`);

    const retention = this.buildRetentionDecision(request);

    const aggregatedAction = mergeActions([
      governanceVerdict.action,
      ...opaDecisions.map((d) => (d.allow ? 'ALLOW' : 'DENY')),
      piiFindings.length && request.stage === 'ingest' ? 'ESCALATE' : 'ALLOW',
      exportPermitted ? 'ALLOW' : 'DENY',
    ]);

    const reasons = [
      ...governanceVerdict.reasons,
      ...opaReasons,
    ];

    if (!exportPermitted) {
      reasons.push('Export control gate denied the request');
    }
    if (piiFindings.length && request.stage === 'ingest') {
      reasons.push('PII detected during ingestion; escalation required');
    }

    return {
      action: aggregatedAction,
      reasons,
      governanceVerdict,
      opaDecisions,
      piiFindings,
      redactedPayload,
      retention,
    };
  }

  private evaluateExportControl(request: ExecutionRequest): boolean {
    if (!request.destinationCountry) {
      return true;
    }
    const controls = request.user.exportControls;
    if (!controls) {
      return false;
    }
    if (controls.destinations.includes(request.destinationCountry)) {
      return true;
    }
    return controls.defaultAction === 'ALLOW';
  }

  private buildRetentionDecision(request: ExecutionRequest): PolicyExecutionResult['retention'] {
    const policyDays = request.retentionDays ?? 30;
    const expiresAt = new Date(Date.now() + policyDays * 24 * 60 * 60 * 1000).toISOString();
    return { expiresAt, policyDays };
  }
}
