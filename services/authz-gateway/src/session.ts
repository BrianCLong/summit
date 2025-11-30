import crypto from 'crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getPrivateKey, getPublicKey } from './keys';

const DEFAULT_SESSION_TTL_SECONDS = Number(
  process.env.SESSION_TTL_SECONDS || 60 * 60,
);

export interface SessionRecord {
  sid: string;
  sub: string;
  acr: string;
  amr: string[];
  expiresAt: number;
  lastSeen: number;
  claims: JWTPayload;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function uniqueAmr(values: string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

export class SessionManager {
  private sessions = new Map<string, SessionRecord>();
  private ttlSeconds: number;

  constructor(ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS) {
    this.ttlSeconds = ttlSeconds;
  }

  clear() {
    this.sessions.clear();
  }

  async createSession(claims: JWTPayload & { sub: string }): Promise<string> {
    const sid = String(claims.sid || crypto.randomUUID());
    const acr = String(claims.acr || 'loa1');
    const amr = uniqueAmr(
      Array.isArray(claims.amr) ? claims.amr.map(String) : ['pwd'],
    );
    const issuedAt = nowSeconds();
    const expiresAt = issuedAt + this.ttlSeconds;
    const record: SessionRecord = {
      sid,
      sub: claims.sub,
      acr,
      amr,
      expiresAt,
      lastSeen: issuedAt,
      claims,
    };
    this.sessions.set(sid, record);
    return this.sign(record);
  }

  async elevateSession(
    sid: string,
    updates: { acr?: string; amr?: string[]; extendSeconds?: number },
  ): Promise<string> {
    const session = this.sessions.get(sid);
    if (!session) {
      throw new Error('session_not_found');
    }
    session.acr = updates.acr ? String(updates.acr) : session.acr;
    session.amr = uniqueAmr([...session.amr, ...(updates.amr || [])]);
    if (updates.extendSeconds && updates.extendSeconds > 0) {
      session.expiresAt += updates.extendSeconds;
    }
    session.lastSeen = nowSeconds();
    return this.sign(session);
  }

  async validate(token: string) {
    const { payload } = await jwtVerify(token, getPublicKey(), {
      issuer: process.env.GATEWAY_ISSUER || 'authz-gateway',
    });
    const sid = String(payload.sid || '');
    const session = this.sessions.get(sid);
    if (!session) {
      throw new Error('session_not_found');
    }
    if (session.expiresAt < nowSeconds()) {
      this.sessions.delete(sid);
      throw new Error('session_expired');
    }
    session.lastSeen = nowSeconds();
    return { payload, session };
  }

  revoke(sid: string) {
    this.sessions.delete(sid);
  }

  expire(sid: string) {
    const session = this.sessions.get(sid);
    if (session) {
      session.expiresAt = nowSeconds() - 1;
    }
  }

  private async sign(session: SessionRecord) {
    const token = await new SignJWT({
      ...session.claims,
      sid: session.sid,
      acr: session.acr,
      amr: session.amr,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
      .setIssuedAt(nowSeconds())
      .setExpirationTime(session.expiresAt)
      .setIssuer(process.env.GATEWAY_ISSUER || 'authz-gateway')
      .sign(getPrivateKey());
    return token;
  }
}

export const sessionManager = new SessionManager();
