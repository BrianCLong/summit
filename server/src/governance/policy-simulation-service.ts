import { randomUUID } from 'crypto';
import { logger } from '../config/logger.js';

export interface AccessEvent {
  requestId?: string;
  actorId: string;
  tenantId: string;
  caseId?: string;
  role?: string;
  action: string;
  resource?: string;
  decision: 'allow' | 'deny';
  candidateDecision?: 'allow' | 'deny';
  timestamp?: string;
  context?: Record<string, unknown>;
}

export interface SimulationOptions {
  candidatePolicy?: string;
  events: AccessEvent[];
}

export interface SimulationDecision {
  allow: boolean;
  source: string;
  reason?: string;
}

export interface TransitionBreakdown {
  total: number;
  allowedToDenied: number;
  deniedToAllowed: number;
}

export interface SimulationResult {
  summary: {
    totalEvents: number;
    baseline: { allowed: number; denied: number };
    candidate: { allowed: number; denied: number };
    transitions: { allowedToDenied: number; deniedToAllowed: number };
  };
  breakdowns: {
    byTenant: Record<string, TransitionBreakdown>;
    byCase: Record<string, TransitionBreakdown>;
    byRole: Record<string, TransitionBreakdown>;
  };
  changes: {
    allowedToDenied: AccessEvent[];
    deniedToAllowed: AccessEvent[];
  };
  metadata: {
    simulatorRunId: string;
    evaluator: string;
    fallback: boolean;
    featureFlagEnabled: boolean;
  };
}

export interface PolicyDecisionEvaluator {
  evaluate(event: AccessEvent, candidatePolicy?: string): Promise<SimulationDecision>;
}

const DEFAULT_FIXTURE_EVENTS: AccessEvent[] = [
  {
    requestId: 'fixture-1',
    actorId: 'analyst-1',
    tenantId: 'tenant-a',
    caseId: 'CASE-001',
    role: 'analyst',
    action: 'read',
    resource: 'case-file',
    decision: 'allow',
    context: { tags: ['restricted'] },
  },
  {
    requestId: 'fixture-2',
    actorId: 'auditor-9',
    tenantId: 'tenant-a',
    caseId: 'CASE-002',
    role: 'auditor',
    action: 'export',
    resource: 'graph',
    decision: 'deny',
    context: { reason: 'missing_warrant' },
  },
  {
    requestId: 'fixture-3',
    actorId: 'ops-4',
    tenantId: 'tenant-b',
    caseId: 'CASE-003',
    role: 'ops',
    action: 'write',
    resource: 'case-file',
    decision: 'allow',
    context: { reason: 'standard_update' },
  },
];

class HeuristicPolicyEvaluator implements PolicyDecisionEvaluator {
  async evaluate(event: AccessEvent, candidatePolicy?: string): Promise<SimulationDecision> {
    if (typeof event.candidateDecision === 'string') {
      return {
        allow: event.candidateDecision === 'allow',
        source: 'event_override',
        reason: 'candidateDecision provided on event',
      };
    }

    if (!candidatePolicy) {
      return {
        allow: event.decision === 'allow',
        source: 'baseline_replay',
        reason: 'no candidate policy provided',
      };
    }

    const policyText = candidatePolicy.toLowerCase();
    const role = (event.role || '').toLowerCase();

    if (policyText.includes('deny_all')) {
      return {
        allow: false,
        source: 'candidate_policy',
        reason: 'deny_all marker present',
      };
    }

    if (role && policyText.includes(`deny_role_${role}`)) {
      return {
        allow: false,
        source: 'candidate_policy',
        reason: `role ${role} explicitly denied`,
      };
    }

    if (role && policyText.includes(`allow_role_${role}`)) {
      return {
        allow: true,
        source: 'candidate_policy',
        reason: `role ${role} explicitly allowed`,
      };
    }

    if (event.caseId) {
      const lowerCaseId = event.caseId.toLowerCase();
      if (policyText.includes(`deny_case_${lowerCaseId}`)) {
        return {
          allow: false,
          source: 'candidate_policy',
          reason: `case ${event.caseId} explicitly denied`,
        };
      }

      if (policyText.includes(`allow_case_${lowerCaseId}`)) {
        return {
          allow: true,
          source: 'candidate_policy',
          reason: `case ${event.caseId} explicitly allowed`,
        };
      }
    }

    return {
      allow: event.decision === 'allow',
      source: 'candidate_policy',
      reason: 'no explicit candidate rule matched; mirrored baseline decision',
    };
  }
}

function ensureTransitionBucket(map: Record<string, TransitionBreakdown>, key: string): TransitionBreakdown {
  if (!map[key]) {
    map[key] = { total: 0, allowedToDenied: 0, deniedToAllowed: 0 };
  }
  return map[key];
}

export class PolicySimulationService {
  constructor(private readonly evaluator: PolicyDecisionEvaluator = new HeuristicPolicyEvaluator()) {}

  async runSimulation(options: SimulationOptions): Promise<SimulationResult> {
    const events = options.events && options.events.length > 0 ? options.events : DEFAULT_FIXTURE_EVENTS;

    this.validateEvents(events);

    const breakdowns = {
      byTenant: {} as Record<string, TransitionBreakdown>,
      byCase: {} as Record<string, TransitionBreakdown>,
      byRole: {} as Record<string, TransitionBreakdown>,
    };

    const changes = {
      allowedToDenied: [] as AccessEvent[],
      deniedToAllowed: [] as AccessEvent[],
    };

    let baselineAllowed = 0;
    let baselineDenied = 0;
    let candidateAllowed = 0;
    let candidateDenied = 0;
    let fallbackUsed = false;

    for (const event of events) {
      const baselineAllow = event.decision === 'allow';
      baselineAllow ? baselineAllowed++ : baselineDenied++;

      let candidateDecision: SimulationDecision;
      try {
        candidateDecision = await this.evaluator.evaluate(event, options.candidatePolicy);
      } catch (error) {
        fallbackUsed = true;
        candidateDecision = {
          allow: baselineAllow,
          source: 'fallback',
          reason: (error as Error).message,
        };
        logger.warn({
          error: (error as Error).message,
          eventId: event.requestId,
        }, 'Policy simulation evaluator failed; used baseline decision');
      }

      if (candidateDecision.allow) {
        candidateAllowed++;
      } else {
        candidateDenied++;
      }

      const transitionKeyTenant = event.tenantId || 'unknown-tenant';
      const transitionKeyCase = event.caseId || 'unknown-case';
      const transitionKeyRole = event.role || 'unknown-role';

      ensureTransitionBucket(breakdowns.byTenant, transitionKeyTenant).total += 1;
      ensureTransitionBucket(breakdowns.byCase, transitionKeyCase).total += 1;
      ensureTransitionBucket(breakdowns.byRole, transitionKeyRole).total += 1;

      if (baselineAllow && !candidateDecision.allow) {
        ensureTransitionBucket(breakdowns.byTenant, transitionKeyTenant).allowedToDenied += 1;
        ensureTransitionBucket(breakdowns.byCase, transitionKeyCase).allowedToDenied += 1;
        ensureTransitionBucket(breakdowns.byRole, transitionKeyRole).allowedToDenied += 1;
        changes.allowedToDenied.push(event);
      }

      if (!baselineAllow && candidateDecision.allow) {
        ensureTransitionBucket(breakdowns.byTenant, transitionKeyTenant).deniedToAllowed += 1;
        ensureTransitionBucket(breakdowns.byCase, transitionKeyCase).deniedToAllowed += 1;
        ensureTransitionBucket(breakdowns.byRole, transitionKeyRole).deniedToAllowed += 1;
        changes.deniedToAllowed.push(event);
      }
    }

    return {
      summary: {
        totalEvents: events.length,
        baseline: {
          allowed: baselineAllowed,
          denied: baselineDenied,
        },
        candidate: {
          allowed: candidateAllowed,
          denied: candidateDenied,
        },
        transitions: {
          allowedToDenied: changes.allowedToDenied.length,
          deniedToAllowed: changes.deniedToAllowed.length,
        },
      },
      breakdowns,
      changes,
      metadata: {
        simulatorRunId: randomUUID(),
        evaluator: this.evaluator.constructor.name,
        fallback: fallbackUsed,
        featureFlagEnabled: process.env.POLICY_SIMULATION === '1',
      },
    };
  }

  private validateEvents(events: AccessEvent[]): void {
    for (const [idx, event] of events.entries()) {
      if (!event.actorId) {
        throw new Error(`Event ${idx} is missing actorId`);
      }
      if (!event.tenantId) {
        throw new Error(`Event ${idx} is missing tenantId`);
      }
      if (!event.action) {
        throw new Error(`Event ${idx} is missing action`);
      }
      if (!['allow', 'deny'].includes(event.decision)) {
        throw new Error(`Event ${idx} must have a decision of allow or deny`);
      }
    }
  }
}

export const defaultPolicySimulationService = new PolicySimulationService();
