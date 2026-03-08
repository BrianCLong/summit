"use strict";
/**
 * Compliance Manager - Legal and regulatory compliance
 * TRAINING/SIMULATION ONLY
 *
 * Implements compliance frameworks for:
 * - NSPM-7 (National Security Presidential Memorandum 7)
 * - Executive Order 12333
 * - USSID 18 (U.S. Signals Intelligence Directive 18)
 * - DoD 5240.1-R
 * - FISA (Foreign Intelligence Surveillance Act)
 * - ECPA (Electronic Communications Privacy Act)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceManager = void 0;
const uuid_1 = require("uuid");
class ComplianceManager {
    logs = [];
    authorities = new Map();
    accessControls = new Map();
    minimizationProcedures = new Map();
    violations = [];
    maxLogs = 100000;
    constructor() {
        this.initializeDefaultAuthorities();
        this.initializeMinimizationProcedures();
        this.log('COMPLIANCE_INIT', 'Compliance Manager initialized in TRAINING mode');
    }
    initializeDefaultAuthorities() {
        const trainingAuth = {
            id: (0, uuid_1.v4)(),
            type: 'TRAINING',
            reference: 'TRAINING-EXERCISE-001',
            description: 'Training and simulation exercise authority',
            validFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            restrictions: ['SIMULATION_ONLY', 'NO_REAL_COLLECTION'],
            minimizationRequired: true,
            active: true
        };
        this.authorities.set(trainingAuth.id, trainingAuth);
    }
    initializeMinimizationProcedures() {
        const procedures = [
            {
                id: (0, uuid_1.v4)(),
                name: 'US Person Minimization',
                description: 'Procedures for handling incidentally collected US person information',
                triggers: ['US_PERSON_DETECTED', 'DOMESTIC_COMMUNICATION'],
                actions: [
                    'MASK_IDENTIFIERS',
                    'REDACT_CONTENT',
                    'LIMIT_RETENTION',
                    'NOTIFY_OVERSIGHT'
                ],
                retentionPeriod: 5,
                requiresApproval: true
            },
            {
                id: (0, uuid_1.v4)(),
                name: 'Attorney-Client Privilege',
                description: 'Procedures for attorney-client communications',
                triggers: ['ATTORNEY_COMMUNICATION', 'LEGAL_PRIVILEGE_DETECTED'],
                actions: [
                    'IMMEDIATE_SEGREGATION',
                    'LEGAL_REVIEW_REQUIRED',
                    'NO_DISSEMINATION'
                ],
                retentionPeriod: 0,
                requiresApproval: true
            },
            {
                id: (0, uuid_1.v4)(),
                name: 'Medical Information',
                description: 'Procedures for protected health information',
                triggers: ['PHI_DETECTED', 'MEDICAL_COMMUNICATION'],
                actions: [
                    'REDACT_PHI',
                    'LIMIT_ACCESS',
                    'HIPAA_COMPLIANCE'
                ],
                retentionPeriod: 0,
                requiresApproval: true
            }
        ];
        procedures.forEach(p => this.minimizationProcedures.set(p.id, p));
    }
    /**
     * Log compliance event
     */
    log(action, details, metadata) {
        const entry = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            action,
            details,
            ...metadata
        };
        this.logs.push(entry);
        // Trim if needed
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        return entry.id;
    }
    /**
     * Check if action is authorized
     */
    checkAuthorization(params) {
        // In training mode, check that authority exists
        const activeAuthorities = Array.from(this.authorities.values())
            .filter(a => a.active && a.validTo > new Date());
        if (activeAuthorities.length === 0) {
            this.recordViolation('NO_VALID_AUTHORITY', `No valid legal authority for action: ${params.action}`);
            return {
                authorized: false,
                reason: 'No valid legal authority found',
                requiredAuthority: 'TRAINING or operational authority required'
            };
        }
        // Check clearance if userId provided
        if (params.userId && params.classification) {
            const access = this.accessControls.get(params.userId);
            if (access) {
                if (!this.hasRequiredClearance(access.clearanceLevel, params.classification)) {
                    this.recordViolation('CLEARANCE_INSUFFICIENT', `User ${params.userId} lacks clearance for ${params.classification}`);
                    return {
                        authorized: false,
                        reason: `Insufficient clearance for ${params.classification} material`
                    };
                }
            }
        }
        this.log('AUTHORIZATION_CHECK', `Action ${params.action} authorized`, {
            userId: params.userId,
            classification: params.classification
        });
        return { authorized: true };
    }
    /**
     * Apply minimization to content
     */
    applyMinimization(content, triggers) {
        let minimized = content;
        const appliedProcedures = [];
        let redactions = 0;
        // Find applicable procedures
        for (const [id, procedure] of this.minimizationProcedures) {
            const applicable = triggers.some(t => procedure.triggers.includes(t));
            if (applicable) {
                appliedProcedures.push(procedure.name);
                // Apply minimization (simulated)
                if (procedure.actions.includes('MASK_IDENTIFIERS')) {
                    // Mask potential identifiers
                    minimized = minimized.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, () => {
                        redactions++;
                        return '[NAME REDACTED]';
                    });
                    minimized = minimized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, () => {
                        redactions++;
                        return '[PHONE REDACTED]';
                    });
                    minimized = minimized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, () => {
                        redactions++;
                        return '[EMAIL REDACTED]';
                    });
                }
                if (procedure.actions.includes('REDACT_PHI')) {
                    minimized = minimized.replace(/\b(SSN|social security|DOB|date of birth)\s*:?\s*[\d\-\/]+/gi, () => {
                        redactions++;
                        return '[PHI REDACTED]';
                    });
                }
            }
        }
        this.log('MINIMIZATION_APPLIED', `Applied ${appliedProcedures.length} procedures, ${redactions} redactions`);
        return { minimized, appliedProcedures, redactions };
    }
    /**
     * Register access control
     */
    registerUser(user) {
        this.accessControls.set(user.userId, user);
        this.log('USER_REGISTERED', `User ${user.userId} registered with ${user.clearanceLevel} clearance`);
    }
    /**
     * Check user access
     */
    checkAccess(userId, requiredCompartments) {
        const access = this.accessControls.get(userId);
        if (!access)
            return false;
        return requiredCompartments.every(c => access.compartments.includes(c));
    }
    /**
     * Add legal authority
     */
    addAuthority(authority) {
        const id = (0, uuid_1.v4)();
        this.authorities.set(id, { ...authority, id });
        this.log('AUTHORITY_ADDED', `Legal authority ${authority.type}: ${authority.reference}`);
        return id;
    }
    /**
     * Validate legal authority
     */
    validateAuthority(authorityId) {
        const authority = this.authorities.get(authorityId);
        if (!authority) {
            return { valid: false, reason: 'Authority not found' };
        }
        if (!authority.active) {
            return { valid: false, reason: 'Authority is inactive' };
        }
        if (authority.validTo < new Date()) {
            return { valid: false, reason: 'Authority has expired' };
        }
        return { valid: true };
    }
    /**
     * Record compliance violation
     */
    recordViolation(type, details) {
        this.violations.push({
            timestamp: new Date(),
            type,
            details
        });
        this.log('VIOLATION_RECORDED', `${type}: ${details}`);
    }
    /**
     * Get compliance status
     */
    getComplianceStatus() {
        const recentViolations = this.violations.filter(v => Date.now() - v.timestamp.getTime() < 24 * 60 * 60 * 1000);
        if (recentViolations.length > 5)
            return 'violation';
        if (recentViolations.length > 0)
            return 'warning';
        return 'compliant';
    }
    /**
     * Get audit report
     */
    getAuditReport(params) {
        let filteredLogs = [...this.logs];
        if (params?.startDate) {
            filteredLogs = filteredLogs.filter(l => l.timestamp >= params.startDate);
        }
        if (params?.endDate) {
            filteredLogs = filteredLogs.filter(l => l.timestamp <= params.endDate);
        }
        if (params?.action) {
            filteredLogs = filteredLogs.filter(l => l.action === params.action);
        }
        if (params?.userId) {
            filteredLogs = filteredLogs.filter(l => l.userId === params.userId);
        }
        const actionCounts = {};
        const uniqueUsers = new Set();
        filteredLogs.forEach(l => {
            actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
            if (l.userId)
                uniqueUsers.add(l.userId);
        });
        return {
            logs: filteredLogs,
            violations: this.violations,
            summary: {
                totalLogs: filteredLogs.length,
                totalViolations: this.violations.length,
                uniqueUsers: uniqueUsers.size,
                actionCounts
            }
        };
    }
    /**
     * Export compliance data for oversight
     */
    exportForOversight() {
        return {
            generatedAt: new Date(),
            mode: 'TRAINING',
            authorities: Array.from(this.authorities.values()),
            procedures: Array.from(this.minimizationProcedures.values()),
            recentLogs: this.logs.slice(-1000),
            violations: this.violations,
            status: this.getComplianceStatus()
        };
    }
    hasRequiredClearance(userLevel, required) {
        const levels = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET', 'TS_SCI'];
        const userIdx = levels.indexOf(userLevel);
        const reqIdx = levels.indexOf(required);
        return userIdx >= reqIdx;
    }
    getLogs() {
        return [...this.logs];
    }
    getAuthorities() {
        return Array.from(this.authorities.values());
    }
    getMinimizationProcedures() {
        return Array.from(this.minimizationProcedures.values());
    }
}
exports.ComplianceManager = ComplianceManager;
