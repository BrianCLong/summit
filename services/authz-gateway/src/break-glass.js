"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.breakGlassManager = void 0;
// @ts-nocheck
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const session_1 = require("./session");
const audit_1 = require("./audit");
const statePath = process.env.BREAK_GLASS_STATE_PATH ||
    path_1.default.join(__dirname, '..', 'break-glass-state.json');
const eventLogPath = process.env.BREAK_GLASS_EVENT_LOG ||
    path_1.default.join(__dirname, '..', 'break-glass-events.log');
function nowIso() {
    return new Date().toISOString();
}
function readState() {
    if (!(0, fs_1.existsSync)(statePath)) {
        return { requests: {} };
    }
    try {
        const raw = (0, fs_1.readFileSync)(statePath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
            requests: parsed.requests || {},
        };
    }
    catch {
        return { requests: {} };
    }
}
function writeState(state) {
    (0, fs_1.writeFileSync)(statePath, JSON.stringify(state, null, 2));
}
function emitEvent(event) {
    (0, fs_1.appendFileSync)(eventLogPath, JSON.stringify(event) + '\n');
}
class BreakGlassManager {
    state;
    ttlSeconds;
    constructor(ttlSeconds) {
        this.state = readState();
        this.ttlSeconds = ttlSeconds;
        this.pruneExpired();
        session_1.sessionManager.setHooks({
            onBreakGlassExpired: (session) => {
                if (session.sid) {
                    this.markExpiredBySid(session.sid);
                }
            },
        });
    }
    createRequest(subjectId, justification, ticketId, scope = ['break_glass:elevated']) {
        if (!justification || !ticketId) {
            throw new Error('justification_and_ticket_required');
        }
        const id = crypto_1.default.randomUUID();
        const requestedAt = nowIso();
        const record = {
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
        (0, audit_1.log)({
            subject: subjectId,
            action: 'break_glass_requested',
            resource: 'break_glass',
            tenantId: 'system',
            allowed: true,
            reason: 'break_glass_request',
        });
        return record;
    }
    async approve(requestId, approverId) {
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
        const breakGlass = {
            requestId: record.id,
            ticketId: record.ticketId,
            justification: record.justification,
            issuedAt,
            expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
            approverId,
        };
        const { token, sid } = await session_1.sessionManager.createBreakGlassSession({
            sub: record.subjectId,
            scope: record.scope,
            acr: 'loa2',
            amr: ['pwd'],
        }, {
            ttlSeconds: this.ttlSeconds,
            breakGlass,
        });
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
        (0, audit_1.log)({
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
    recordUsage(sid, details) {
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
        (0, audit_1.log)({
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
    markExpiredBySid(sid) {
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
        (0, audit_1.log)({
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
    findRequestBySid(sid) {
        return Object.values(this.state.requests).find((request) => request.sid === sid);
    }
    pruneExpired() {
        const nowSeconds = Math.floor(Date.now() / 1000);
        let updated = false;
        Object.values(this.state.requests).forEach((record) => {
            if (record.status === 'approved' && record.expiresAt) {
                const expiresAtSeconds = Math.floor(new Date(record.expiresAt).getTime() / 1000);
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
                    (0, audit_1.log)({
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
exports.breakGlassManager = new BreakGlassManager(ttlSeconds);
