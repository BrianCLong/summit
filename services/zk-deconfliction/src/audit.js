"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Audit Logger for ZK Deconfliction Operations
 * Maintains tamper-evident log of all deconfliction checks
 */
class AuditLogger {
    logs = [];
    /**
     * Record a deconfliction operation
     */
    log(tenantAId, tenantBId, hasOverlap, overlapCount, proof, context) {
        const entry = {
            id: crypto_1.default.randomBytes(16).toString('hex'),
            timestamp: new Date().toISOString(),
            tenantAId,
            tenantBId,
            hasOverlap,
            overlapCount,
            proof,
            context,
        };
        this.logs.push(entry);
        return entry;
    }
    /**
     * Get all audit logs
     */
    getLogs() {
        return [...this.logs];
    }
    /**
     * Get logs for a specific tenant
     */
    getLogsByTenant(tenantId) {
        return this.logs.filter((log) => log.tenantAId === tenantId || log.tenantBId === tenantId);
    }
    /**
     * Get log by ID
     */
    getLogById(id) {
        return this.logs.find((log) => log.id === id);
    }
    /**
     * Export logs (for external audit)
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
}
exports.AuditLogger = AuditLogger;
