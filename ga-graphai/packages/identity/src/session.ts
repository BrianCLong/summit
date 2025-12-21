import { randomUUID } from 'node:crypto';
import type { AuditLogEvent } from 'common-types';
import jwt from 'jsonwebtoken';
import { AuditBus } from './audit.js';
import type { OidcValidationResult, Session } from './types.js';

interface SessionOptions {
  ttlSeconds?: number;
}

export class SessionService {
  private readonly sessions = new Map<string, Session>();
  private readonly audit: AuditBus;
  private readonly ttlSeconds: number;

  constructor(audit: AuditBus, options: SessionOptions = {}) {
    this.audit = audit;
    this.ttlSeconds = options.ttlSeconds ?? 900;
  }

  createFromOidc(result: OidcValidationResult): Session {
    const sessionId = randomUUID();
    const refreshToken = randomUUID();
    const expiresAt = Date.now() + this.ttlSeconds * 1000;

    const session: Session = {
      sessionId,
      refreshToken,
      userId: result.profile.sub,
      tenantId: result.profile.tenant ?? 'default',
      scopes: ['openid', 'profile', 'email', ...(result.profile.groups ?? [])],
      expiresAt,
    };

    this.sessions.set(sessionId, session);
    this.audit.emit(this.auditEvent('login.success', session, result.traceId));
    return session;
  }

  refresh(sessionId: string): Session | null {
    const existing = this.sessions.get(sessionId);
    if (!existing || existing.expiresAt < Date.now()) {
      return null;
    }
    const renewed = { ...existing, expiresAt: Date.now() + this.ttlSeconds * 1000 };
    this.sessions.set(sessionId, renewed);
    return renewed;
  }

  revoke(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  validate(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    return session;
  }

  private auditEvent(action: string, session: Session, traceId: string): AuditLogEvent {
    return {
      action,
      actor: session.userId,
      tenant: session.tenantId,
      resource: 'session',
      trace_id: traceId,
    };
  }
}

export function validateOidcToken(token: string, jwkSecret: string): OidcValidationResult {
  const decoded = jwt.verify(token, jwkSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
  if (!decoded.sub || !decoded.email) {
    throw new Error('OIDC token missing subject or email');
  }
  return {
    profile: {
      sub: decoded.sub as string,
      email: decoded.email as string,
      name: decoded.name as string,
      tenant: (decoded as { tenant?: string }).tenant,
      groups: (decoded as { groups?: string[] }).groups ?? [],
    },
    traceId: (decoded as { jti?: string }).jti ?? randomUUID(),
  };
}
