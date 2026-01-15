import { randomUUID } from 'crypto';
import { SupportActor, enforceSupportPolicy } from './SupportPolicyGate.js';
import { SUPPORT_IMPERSONATION_POLICY } from '../../policies/support.js';
import { recordImpersonationReceipt } from '../../provenance/impersonation-receipts.js';
import { AppError } from '../../lib/errors.js';

export interface ImpersonationSession {
  id: string;
  startedAt: string;
  expiresAt: string;
  actor: SupportActor;
  target: {
    userId: string;
    tenantId: string;
  };
  reason: string;
  ticketId?: string;
  active: boolean;
}

export class SupportImpersonationService {
  private static instance: SupportImpersonationService;
  private sessions = new Map<string, ImpersonationSession>();
  private defaultDurationMs = 60 * 60 * 1000;

  public static getInstance(): SupportImpersonationService {
    if (!SupportImpersonationService.instance) {
      SupportImpersonationService.instance = new SupportImpersonationService();
    }
    return SupportImpersonationService.instance;
  }

  async startImpersonation(params: {
    actor: SupportActor;
    targetUserId: string;
    targetTenantId: string;
    reason: string;
    ticketId?: string;
  }) {
    const { actor, targetUserId, targetTenantId, reason, ticketId } = params;
    const policyDecision = await enforceSupportPolicy({
      actor,
      policy: SUPPORT_IMPERSONATION_POLICY,
      action: 'support:impersonate',
      resource: {
        id: targetUserId,
        type: 'SupportImpersonation',
        targetTenantId,
      },
      justification: reason,
    });

    const sessionId = randomUUID();
    const startedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.defaultDurationMs).toISOString();

    const session: ImpersonationSession = {
      id: sessionId,
      startedAt,
      expiresAt,
      actor,
      target: {
        userId: targetUserId,
        tenantId: targetTenantId,
      },
      reason,
      ticketId,
      active: true,
    };

    this.sessions.set(sessionId, session);

    const receipt = await recordImpersonationReceipt({
      action: 'start',
      sessionId,
      actor,
      target: session.target,
      justification: reason,
      policy: {
        id: policyDecision.policyId,
        decisionId: policyDecision.policyDecisionId,
        allow: policyDecision.allow,
      },
      metadata: {
        ticketId,
      },
    });

    return {
      session,
      receipt,
      policyDecision,
    };
  }

  async stopImpersonation(params: {
    actor: SupportActor;
    sessionId: string;
    reason: string;
  }) {
    const { actor, sessionId, reason } = params;
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new AppError('Impersonation session not found.', 404, 'IMPERSONATION_NOT_FOUND');
    }

    const policyDecision = await enforceSupportPolicy({
      actor,
      policy: SUPPORT_IMPERSONATION_POLICY,
      action: 'support:impersonate',
      resource: {
        id: sessionId,
        type: 'SupportImpersonation',
        targetTenantId: session.target.tenantId,
      },
      justification: reason,
    });

    session.active = false;

    const receipt = await recordImpersonationReceipt({
      action: 'stop',
      sessionId,
      actor,
      target: session.target,
      justification: reason,
      policy: {
        id: policyDecision.policyId,
        decisionId: policyDecision.policyDecisionId,
        allow: policyDecision.allow,
      },
      metadata: {
        ticketId: session.ticketId,
        endedAt: new Date().toISOString(),
      },
    });

    return {
      session,
      receipt,
      policyDecision,
    };
  }

  getSession(sessionId: string): ImpersonationSession | undefined {
    return this.sessions.get(sessionId);
  }
}

export const supportImpersonationService =
  SupportImpersonationService.getInstance();
