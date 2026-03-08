"use strict";
/**
 * Cloud Governance Package
 * Security, access control, and compliance for lakehouse
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceManager = exports.AccessLevel = void 0;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'cloud-governance' });
var AccessLevel;
(function (AccessLevel) {
    AccessLevel["READ"] = "read";
    AccessLevel["WRITE"] = "write";
    AccessLevel["ADMIN"] = "admin";
    AccessLevel["NONE"] = "none";
})(AccessLevel || (exports.AccessLevel = AccessLevel = {}));
class GovernanceManager {
    policies;
    auditLogs;
    classifications;
    constructor() {
        this.policies = new Map();
        this.auditLogs = [];
        this.classifications = new Map();
    }
    async createPolicy(policy) {
        const fullPolicy = {
            ...policy,
            id: (0, uuid_1.v4)(),
            createdAt: new Date()
        };
        this.policies.set(fullPolicy.id, fullPolicy);
        logger.info({ policyId: fullPolicy.id }, 'Access policy created');
        return fullPolicy;
    }
    async checkAccess(principal, resource, action) {
        for (const policy of this.policies.values()) {
            if (policy.principal === principal && this.matchesResource(policy.resource, resource)) {
                if (policy.expiresAt && policy.expiresAt < new Date()) {
                    continue;
                }
                const hasAccess = this.evaluateAccess(policy.access, action);
                await this.logAccess(principal, action, resource, hasAccess ? 'success' : 'denied');
                return hasAccess;
            }
        }
        await this.logAccess(principal, action, resource, 'denied');
        return false;
    }
    matchesResource(policyResource, requestedResource) {
        // Support wildcards
        const pattern = policyResource.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(requestedResource);
    }
    evaluateAccess(policyAccess, action) {
        const actionLevels = {
            'read': AccessLevel.READ,
            'select': AccessLevel.READ,
            'write': AccessLevel.WRITE,
            'insert': AccessLevel.WRITE,
            'update': AccessLevel.WRITE,
            'delete': AccessLevel.ADMIN,
            'drop': AccessLevel.ADMIN
        };
        const requiredLevel = actionLevels[action.toLowerCase()] || AccessLevel.ADMIN;
        const levelHierarchy = [AccessLevel.NONE, AccessLevel.READ, AccessLevel.WRITE, AccessLevel.ADMIN];
        return levelHierarchy.indexOf(policyAccess) >= levelHierarchy.indexOf(requiredLevel);
    }
    async logAccess(principal, action, resource, status) {
        const log = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            principal,
            action,
            resource,
            status,
            metadata: {}
        };
        this.auditLogs.push(log);
        if (status === 'denied') {
            logger.warn({ log }, 'Access denied');
        }
    }
    async getAuditLogs(filters) {
        let logs = [...this.auditLogs];
        if (filters) {
            if (filters.principal) {
                logs = logs.filter(l => l.principal === filters.principal);
            }
            if (filters.resource) {
                logs = logs.filter(l => l.resource === filters.resource);
            }
            if (filters.startTime) {
                logs = logs.filter(l => l.timestamp >= filters.startTime);
            }
            if (filters.endTime) {
                logs = logs.filter(l => l.timestamp <= filters.endTime);
            }
        }
        return logs;
    }
    async classifyData(resource, classification) {
        this.classifications.set(resource, classification);
        logger.info({ resource, classification }, 'Data classification set');
    }
    async getClassification(resource) {
        return this.classifications.get(resource);
    }
    async detectPII(data) {
        const piiPatterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            ssn: /^\d{3}-\d{2}-\d{4}$/,
            phone: /^\+?[\d\s\-()]+$/,
            creditCard: /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/
        };
        const piiFields = [];
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                for (const [type, pattern] of Object.entries(piiPatterns)) {
                    if (pattern.test(value)) {
                        piiFields.push(key);
                        break;
                    }
                }
            }
        }
        return {
            containsPII: piiFields.length > 0,
            fields: piiFields
        };
    }
    async maskData(data, fields) {
        const masked = { ...data };
        for (const field of fields) {
            if (masked[field] && typeof masked[field] === 'string') {
                const value = masked[field];
                masked[field] = value.substring(0, 3) + '*'.repeat(value.length - 3);
            }
        }
        return masked;
    }
}
exports.GovernanceManager = GovernanceManager;
__exportStar(require("./encryption.js"), exports);
__exportStar(require("./compliance.js"), exports);
