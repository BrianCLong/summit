"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalGate = void 0;
const crypto_1 = __importDefault(require("crypto"));
class ApprovalGate {
    requests = new Map();
    audit = [];
    requestApproval(payload) {
        const id = crypto_1.default.randomUUID();
        const request = {
            ...payload,
            id,
            status: 'pending',
            createdAt: Date.now(),
        };
        this.requests.set(id, request);
        this.audit.push(request);
        return request;
    }
    approve(id, reviewer) {
        const request = this.getRequest(id);
        if (request.requester === reviewer) {
            throw new Error('Requester cannot approve their own request');
        }
        if (this.isExpired(request)) {
            throw new Error('Approval request expired');
        }
        request.status = 'approved';
        request.reviewer = reviewer;
        request.token = this.buildToken(request);
        return request;
    }
    deny(id, reviewer) {
        const request = this.getRequest(id);
        if (this.isExpired(request)) {
            throw new Error('Approval request expired');
        }
        request.status = 'denied';
        request.reviewer = reviewer;
        return request;
    }
    validateToken(actionType, scope, planHash, token) {
        if (!token)
            return false;
        const parts = token.split(':');
        if (parts.length !== 2)
            return false;
        const [id, signature] = parts;
        const request = this.requests.get(id);
        if (!request || request.status !== 'approved' || !request.token)
            return false;
        if (this.isExpired(request))
            return false;
        if (request.actionType !== actionType || request.scope !== scope || request.planHash !== planHash) {
            return false;
        }
        const expected = this.buildToken(request);
        return expected === `${id}:${signature}`;
    }
    getAuditLog() {
        return [...this.audit];
    }
    getRequest(id) {
        const request = this.requests.get(id);
        if (!request) {
            throw new Error('Approval request not found');
        }
        return request;
    }
    isExpired(request) {
        return Date.now() - request.createdAt > request.ttlMs;
    }
    buildToken(request) {
        const id = request.id;
        const signature = crypto_1.default
            .createHash('sha256')
            .update([request.actionType, request.scope, request.planHash, request.createdAt].join('|'))
            .digest('hex');
        return `${id}:${signature}`;
    }
}
exports.ApprovalGate = ApprovalGate;
