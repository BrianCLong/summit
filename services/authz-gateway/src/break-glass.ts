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
  private sweepTimer?: NodeJS.Timeout;

  constructor(ttlSeconds: number) {
    this.state = readState();
    this.ttlSeconds = ttlSeconds;
    sessionManager.setHooks({
      onBreakGlassExpired: (session) => {
        if (session.sid) {
          this.markExpiredBySid(session.sid);
        }
      },
    });
    this.startExpirySweep();
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
    if (record.status === 'expired') {
      throw new Error('request_expired');
    }
    if (record.status === 'approved') {
      throw new Error('request_already_approved');
    }
    if (record.expiresAt && this.isPast(record.expiresAt)) {
      this.markExpired(record);
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
      detail: { expiresAt: breakGlass.expiresAt },
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
    return { token, expiresAt: breakGlass.expiresAt, scope: record.scope };
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
    if (record.sid) {
      sessionManager.expire(record.sid);
    }
    this.markExpired(record);
  }

  private findRequestBySid(sid: string) {
    return Object.values(this.state.requests).find(
      (request) => request.sid === sid,
    );
  }

  private markExpired(record: BreakGlassRequestRecord) {
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

  private isPast(dateIso: string) {
    return new Date(dateIso).getTime() <= Date.now();
  }

  private startExpirySweep() {
    this.sweepTimer = setInterval(() => {
      this.sweepExpiredApprovals();
    }, 5000);
    this.sweepTimer.unref();
  }

  sweepExpiredApprovals() {
    Object.values(this.state.requests)
      .filter((request) => request.status === 'approved' && request.expiresAt)
      .forEach((request) => {
        if (request.expiresAt && this.isPast(request.expiresAt)) {
          this.markExpired(request);
        }
      });
  }
}

const ttlSeconds = Number(process.env.BREAK_GLASS_TTL_SECONDS || 15 * 60);
export const breakGlassManager = new BreakGlassManager(ttlSeconds);
