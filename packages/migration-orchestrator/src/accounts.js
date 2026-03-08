"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantLifecycle = exports.AccountLinkService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class AccountLinkService {
    constructor() {
        this.links = new Map();
        this.exceptionRegistry = new Map();
    }
    link(oldTenantId, newTenantId, reversible = true) {
        const key = `${oldTenantId}:${newTenantId}`;
        const existing = this.links.get(key);
        if (existing)
            return existing;
        const entry = {
            oldTenantId,
            newTenantId,
            createdAt: new Date(),
            checkpoints: [],
            auditTrail: [`linked:${new Date().toISOString()}`],
            reversible,
        };
        this.links.set(key, entry);
        return entry;
    }
    checkpoint(oldTenantId, newTenantId, note) {
        const link = this.links.get(`${oldTenantId}:${newTenantId}`);
        if (!link)
            throw new Error('link not found');
        link.checkpoints.push(note);
        link.auditTrail.push(`checkpoint:${note}`);
    }
    rollback(oldTenantId, newTenantId, reason) {
        const link = this.links.get(`${oldTenantId}:${newTenantId}`);
        if (!link)
            throw new Error('link not found');
        if (!link.reversible)
            throw new Error('rollback not permitted');
        link.auditTrail.push(`rollback:${reason}`);
    }
    registerException(entry) {
        const id = node_crypto_1.default.randomUUID();
        const exception = { ...entry, id, resolved: false };
        this.exceptionRegistry.set(id, exception);
        return exception;
    }
    resolveException(id) {
        const entry = this.exceptionRegistry.get(id);
        if (!entry)
            throw new Error('unknown exception');
        entry.resolved = true;
    }
    listExceptions() {
        return Array.from(this.exceptionRegistry.values()).sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
    }
}
exports.AccountLinkService = AccountLinkService;
class TenantLifecycle {
    constructor() {
        this.phases = new Map();
        this.freezeWindows = new Set();
    }
    setPhase(tenantId, phase) {
        this.phases.set(tenantId, phase);
    }
    getPhase(tenantId) {
        return this.phases.get(tenantId) ?? 'inventory';
    }
    activateFreeze(tenantId) {
        this.freezeWindows.add(tenantId);
    }
    clearFreeze(tenantId) {
        this.freezeWindows.delete(tenantId);
    }
    isFrozen(tenantId) {
        return this.freezeWindows.has(tenantId);
    }
}
exports.TenantLifecycle = TenantLifecycle;
