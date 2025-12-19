import type { JWTPayload } from 'jose';
import { log } from './audit';
import { sessionManager, type SessionRecord } from './session';

export interface BreakGlassApproval {
  approver: string;
  note?: string;
}

export interface BreakGlassGrantRequest {
  sid: string;
  reason: string;
  role: string;
  requestedBy: string;
  durationSeconds: number;
  approvals?: BreakGlassApproval[];
  resourceId?: string;
}

export interface BreakGlassSession extends BreakGlassGrantRequest {
  tenantId: string;
  subject: string;
  grantedAt: string;
  expiresAt: string;
  active: boolean;
}

interface BreakGlassOptions {
  now?: () => number;
}

const DEFAULT_DURATION_SECONDS = 30 * 60;

function isEnabled() {
  return process.env.BREAK_GLASS === '1';
}

function toSeconds(ms: number) {
  return Math.floor(ms / 1000);
}

export class BreakGlassManager {
  private sessions = new Map<string, BreakGlassSession>();
  private now: () => number;

  constructor(options: BreakGlassOptions = {}) {
    this.now = options.now ?? Date.now;
  }

  clear() {
    this.sessions.clear();
  }

  listActive(): BreakGlassSession[] {
    this.expireElapsed();
    return Array.from(this.sessions.values()).filter(
      (session) => session.active,
    );
  }

  async grant(
    request: BreakGlassGrantRequest,
  ): Promise<{ token: string; session: BreakGlassSession }> {
    if (!isEnabled()) {
      throw new Error('break_glass_disabled');
    }
    const session = this.requireSession(request.sid);
    const durationSeconds =
      request.durationSeconds && request.durationSeconds > 0
        ? request.durationSeconds
        : DEFAULT_DURATION_SECONDS;
    const now = this.now();
    const expiresAt = now + durationSeconds * 1000;
    const breakGlassSession: BreakGlassSession = {
      ...request,
      tenantId: String(
        (session.claims as { tenantId?: string }).tenantId || 'unknown',
      ),
      subject: session.sub,
      grantedAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      active: true,
    };
    this.sessions.set(request.sid, breakGlassSession);

    const token = await sessionManager.elevateSession(request.sid, {
      acr: 'loa3',
      amr: ['break_glass'],
      extendSeconds: durationSeconds,
      claims: this.mergeBreakGlassClaim(session.claims, breakGlassSession),
    });

    log({
      subject: session.sub,
      tenantId: breakGlassSession.tenantId,
      action: 'break_glass_grant',
      resource: breakGlassSession.role,
      allowed: true,
      reason: 'break_glass_granted',
      details: {
        requestedBy: request.requestedBy,
        approvals: request.approvals ?? [],
        expiresAt: breakGlassSession.expiresAt,
        resourceId: request.resourceId,
      },
    });

    return { token, session: breakGlassSession };
  }

  revoke(sid: string, actor: string, reason = 'revoked') {
    const session = this.sessions.get(sid);
    if (!session) {
      return;
    }
    this.sessions.delete(sid);
    sessionManager.expire(sid);
    log({
      subject: session.subject,
      tenantId: session.tenantId,
      action: 'break_glass_revoke',
      resource: session.role,
      allowed: false,
      reason,
      details: {
        revokedBy: actor,
        expiresAt: session.expiresAt,
      },
    });
  }

  requireActive(sid: string): BreakGlassSession {
    this.expireElapsed();
    const session = this.sessions.get(sid);
    if (!session || !session.active) {
      throw new Error('session_expired');
    }
    return session;
  }

  private mergeBreakGlassClaim(
    claims: JWTPayload,
    session: BreakGlassSession,
  ): JWTPayload & { breakGlass: BreakGlassSession } {
    return {
      ...claims,
      breakGlass: session,
    };
  }

  private expireElapsed() {
    const now = this.now();
    for (const [sid, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt).getTime() <= now || !session.active) {
        this.sessions.delete(sid);
        sessionManager.expire(sid);
        log({
          subject: session.subject,
          tenantId: session.tenantId,
          action: 'break_glass_expired',
          resource: session.role,
          allowed: false,
          reason: 'expired',
          details: {
            requestedBy: session.requestedBy,
            approvals: session.approvals ?? [],
            expiresAt: session.expiresAt,
          },
        });
      }
    }
  }

  private requireSession(sid: string): SessionRecord {
    const session = sessionManager.getSession(sid);
    if (!session) {
      throw new Error('session_not_found');
    }
    const now = toSeconds(this.now());
    if (session.expiresAt < now) {
      sessionManager.expire(sid);
      throw new Error('session_expired');
    }
    return session;
  }
}
