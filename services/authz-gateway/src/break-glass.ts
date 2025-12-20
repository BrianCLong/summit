import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sessionManager } from './session';
import type { BreakGlassMetadata } from './types';
import { log } from './audit';

export type BreakGlassStatus = 'pending' | 'approved' | 'expired';

export interface BreakGlassRequestRecord {
  id: string;
  subjectId: string;
  justification: string;
  ticketId: string;
  scope: string[];
  status: BreakGlassStatus;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  expiresAt?: string;
  sid?: string;
  usageCount?: number;
  consumedAt?: string;
}

interface BreakGlassState {
  requests: Record<string, BreakGlassRequestRecord>;
}

interface BreakGlassEvent {
  type: 'request' | 'approval' | 'usage' | 'expiry' | 'rejection';
  requestId: string;
  subjectId: string;
  ticketId: string;
  justification: string;
  ts: string;
  actor?: string;
  detail?: Record<string, unknown>;
}

const statePath =
  process.env.BREAK_GLASS_STATE_PATH ||
  path.join(__dirname, '..', 'break-glass-state.json');
const eventLogPath =
  process.env.BREAK_GLASS_EVENT_LOG ||
  path.join(__dirname, '..', 'break-glass-events.log');

function nowIso() {
  return new Date().toISOString();
}

function readState(): BreakGlassState {
  if (!existsSync(statePath)) {
    return { requests: {} };
  }
  try {
    const raw = readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw) as BreakGlassState;
    return {
      requests: parsed.requests || {},
    };
  } catch {
    return { requests: {} };
  }
}

function writeState(state: BreakGlassState) {
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function emitEvent(event: BreakGlassEvent) {
  appendFileSync(eventLogPath, JSON.stringify(event) + '\n');
}

class BreakGlassManager {
  private state: BreakGlassState;
  private ttlSeconds: number;

  constructor(ttlSeconds: number) {
    this.state = readState();
    this.ttlSeconds = ttlSeconds;
    this.pruneExpired();
    sessionManager.setHooks({
      onBreakGlassExpired: (session) => {
        if (session.sid) {
          this.markExpiredBySid(session.sid);
        }
      },
    });
  }

  createRequest(
    subjectId: string,
    justification: string,
    ticketId: string,
    scope: string[] = ['break_glass:elevated'],
  ): BreakGlassRequestRecord {
    if (!justification || !ticketId) {
      throw new Error('justification_and_ticket_required');
    }
    const id = crypto.randomUUID();
    const requestedAt = nowIso();
    const record: BreakGlassRequestRecord = {
      id,
      subjectId,
      justification,
      ticketId,
      scope,
      status: 'pending',
      requestedAt,
    };
    this.state.requests[id] = record;
    writeState(this.state);
    emitEvent({
      type: 'request',
      requestId: id,
      subjectId,
      ticketId,
      justification,
      ts: requestedAt,
      detail: { scope },
    });
    log({
      subject: subjectId,
      action: 'break_glass_requested',
      resource: 'break_glass',
      tenantId: 'system',
      allowed: true,
      reason: 'break_glass_request',
    });
    return record;
  }

  async approve(requestId: string, approverId: string) {
    const record = this.state.requests[requestId];
    if (!record) {
      throw new Error('request_not_found');
    }
    if (record.status === 'approved') {
      throw new Error('request_already_approved');
    }
    if (record.status === 'expired') {
      throw new Error('request_expired');
    }
    const issuedAt = nowIso();
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + this.ttlSeconds;
    const breakGlass: BreakGlassMetadata = {
      requestId: record.id,
      ticketId: record.ticketId,
      justification: record.justification,
      issuedAt,
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
      approverId,
    };
    const { token, sid } = await sessionManager.createBreakGlassSession(
      {
        sub: record.subjectId,
        scope: record.scope,
        acr: 'loa2',
        amr: ['pwd'],
      },
      {
        ttlSeconds: this.ttlSeconds,
        breakGlass,
      },
    );
    record.status = 'approved';
    record.approvedAt = issuedAt;
    record.approvedBy = approverId;
    record.expiresAt = breakGlass.expiresAt;
    record.sid = sid;
    record.immutableExpiry = true;
    record.singleUse = true;
    this.state.requests[requestId] = record;
    writeState(this.state);
    emitEvent({
      type: 'approval',
      requestId: record.id,
      subjectId: record.subjectId,
      ticketId: record.ticketId,
      justification: record.justification,
      ts: issuedAt,
      actor: approverId,
      detail: {
        expiresAt: breakGlass.expiresAt,
        sid,
        immutableExpiry: true,
        singleUse: true,
      },
    });
    log({
      subject: record.subjectId,
      action: 'break_glass_approved',
      resource: 'break_glass',
      tenantId: 'system',
      allowed: true,
      reason: 'break_glass',
      breakGlass,
    });
    return {
      token,
      expiresAt: breakGlass.expiresAt,
      scope: record.scope,
      sid,
      immutableExpiry: true,
      singleUse: true,
    };
  }

  recordUsage(
    sid: string,
    details: {
      action: string;
      resource: string;
      tenantId: string;
      allowed: boolean;
    },
  ) {
    const record = this.findRequestBySid(sid);
    if (!record) {
      return;
    }
    record.usageCount = (record.usageCount || 0) + 1;
    record.consumedAt = record.consumedAt || nowIso();
    this.state.requests[record.id] = record;
    writeState(this.state);
    emitEvent({
      type: 'usage',
      requestId: record.id,
      subjectId: record.subjectId,
      ticketId: record.ticketId,
      justification: record.justification,
      ts: nowIso(),
      detail: {
        action: details.action,
        resource: details.resource,
        tenantId: details.tenantId,
        allowed: details.allowed,
        expiresAt: record.expiresAt,
      },
    });
    log({
      subject: record.subjectId,
      action: details.action,
      resource: details.resource,
      tenantId: details.tenantId,
      allowed: details.allowed,
      reason: 'break_glass_usage',
      breakGlass: record.expiresAt
        ? {
            requestId: record.id,
            ticketId: record.ticketId,
            justification: record.justification,
            issuedAt: record.approvedAt || record.requestedAt,
            expiresAt: record.expiresAt,
            approverId: record.approvedBy || 'unknown',
          }
        : undefined,
    });
  }

  markExpiredBySid(sid: string) {
    const record = this.findRequestBySid(sid);
    if (!record || record.status === 'expired') {
      return;
    }
    record.status = 'expired';
    this.state.requests[record.id] = record;
    writeState(this.state);
    emitEvent({
      type: 'expiry',
      requestId: record.id,
      subjectId: record.subjectId,
      ticketId: record.ticketId,
      justification: record.justification,
      ts: nowIso(),
    });
    log({
      subject: record.subjectId,
      action: 'break_glass_expired',
      resource: 'break_glass',
      tenantId: 'system',
      allowed: false,
      reason: 'break_glass_expired',
      breakGlass: record.expiresAt
        ? {
            requestId: record.id,
            ticketId: record.ticketId,
            justification: record.justification,
            issuedAt: record.approvedAt || record.requestedAt,
            expiresAt: record.expiresAt,
            approverId: record.approvedBy || 'unknown',
          }
        : undefined,
    });
  }

  private findRequestBySid(sid: string) {
    return Object.values(this.state.requests).find(
      (request) => request.sid === sid,
    );
  }

  private pruneExpired() {
    const nowSeconds = Math.floor(Date.now() / 1000);
    let updated = false;
    Object.values(this.state.requests).forEach((record) => {
      if (record.status === 'approved' && record.expiresAt) {
        const expiresAtSeconds = Math.floor(
          new Date(record.expiresAt).getTime() / 1000,
        );
        if (expiresAtSeconds < nowSeconds) {
          record.status = 'expired';
          updated = true;
          emitEvent({
            type: 'expiry',
            requestId: record.id,
            subjectId: record.subjectId,
            ticketId: record.ticketId,
            justification: record.justification,
            ts: nowIso(),
            detail: { reason: 'startup_prune' },
          });
          log({
            subject: record.subjectId,
            action: 'break_glass_expired',
            resource: 'break_glass',
            tenantId: 'system',
            allowed: false,
            reason: 'break_glass_expired',
            breakGlass: {
              requestId: record.id,
              ticketId: record.ticketId,
              justification: record.justification,
              issuedAt: record.approvedAt || record.requestedAt,
              expiresAt: record.expiresAt,
              approverId: record.approvedBy || 'unknown',
            },
          });
        }
      }
    });
    if (updated) {
      writeState(this.state);
    }
  }
}

const ttlSeconds = Number(process.env.BREAK_GLASS_TTL_SECONDS || 15 * 60);
export const breakGlassManager = new BreakGlassManager(ttlSeconds);
