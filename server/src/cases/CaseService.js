"use strict";
/**
 * Case Service - Business logic layer for Case Spaces
 * Handles case operations with integrated audit logging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseService = void 0;
const node_crypto_1 = require("node:crypto");
const CaseRepo_js_1 = require("../repos/CaseRepo.js");
const AuditAccessLogRepo_js_1 = require("../repos/AuditAccessLogRepo.js");
const ReleaseCriteriaService_js_1 = require("./ReleaseCriteriaService.js");
const CaseSLAService_js_1 = require("./sla/CaseSLAService.js");
const featureFlags_js_1 = require("../lib/featureFlags.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const errors_js_1 = require("../lib/errors.js");
const serviceLogger = logger_js_1.default.child({ name: 'CaseService' });
class CaseService {
    caseRepo;
    auditRepo;
    releaseCriteriaService;
    slaService;
    pg;
    constructor(pg) {
        this.pg = pg;
        this.caseRepo = new CaseRepo_js_1.CaseRepo(pg);
        this.auditRepo = new AuditAccessLogRepo_js_1.AuditAccessLogRepo(pg);
        this.releaseCriteriaService = new ReleaseCriteriaService_js_1.ReleaseCriteriaService(pg);
        this.slaService = new CaseSLAService_js_1.CaseSLAService(pg);
    }
    /**
     * Create a new case
     */
    async createCase(input, userId, auditContext) {
        const caseRecord = await this.caseRepo.create(input, userId);
        // Auto-create initial SLA if configured
        try {
            await this.slaService.createTimer({
                caseId: caseRecord.id,
                tenantId: input.tenantId,
                type: 'RESOLUTION_TIME',
                name: 'Standard Resolution SLA',
                targetDurationSeconds: 7 * 24 * 60 * 60, // 7 days default
                metadata: { created_by: userId }
            });
        }
        catch (e) {
            serviceLogger.error({ err: e, caseId: caseRecord.id }, 'Failed to create initial SLA timer');
        }
        // Log the creation in audit trail
        await this.auditRepo.logAccess({
            tenantId: input.tenantId,
            caseId: caseRecord.id,
            userId,
            action: 'create',
            resourceType: 'case',
            resourceId: caseRecord.id,
            reason: auditContext?.reason || 'Case created',
            legalBasis: auditContext?.legalBasis || 'investigation',
            ...auditContext,
        });
        return caseRecord;
    }
    /**
     * Get a case by ID with audit logging
     */
    async getCase(id, tenantId, userId, auditContext) {
        const caseRecord = await this.caseRepo.findById(id, tenantId);
        if (caseRecord) {
            // Log the view access
            await this.auditRepo.logAccess({
                tenantId,
                caseId: id,
                userId,
                action: 'view',
                resourceType: 'case',
                resourceId: id,
                ...auditContext,
            });
        }
        return caseRecord;
    }
    /**
     * Update a case with audit logging
     */
    async updateCase(input, userId, tenantId, auditContext) {
        const updatedCase = await this.caseRepo.update(input, userId);
        if (updatedCase) {
            // Log the modification
            await this.auditRepo.logAccess({
                tenantId,
                caseId: input.id,
                userId,
                action: 'modify',
                resourceType: 'case',
                resourceId: input.id,
                ...auditContext,
            });
        }
        return updatedCase;
    }
    /**
     * List cases (no audit logging for list operations by default)
     */
    async listCases(params) {
        return this.caseRepo.list(params);
    }
    /**
     * Archive a case with audit logging
     */
    async archiveCase(id, userId, tenantId, auditContext) {
        const archivedCase = await this.caseRepo.archive(id, userId);
        if (archivedCase) {
            // Log the archival
            await this.auditRepo.logAccess({
                tenantId,
                caseId: id,
                userId,
                action: 'archive',
                resourceType: 'case',
                resourceId: id,
                ...auditContext,
            });
        }
        return archivedCase;
    }
    /**
     * Export case data with audit logging
     */
    async exportCase(id, tenantId, userId, auditContext) {
        // Check release criteria if enabled
        if ((0, featureFlags_js_1.isEnabled)('release-criteria', { tenantId, userId })) {
            const evaluation = await this.releaseCriteriaService.evaluate(id, tenantId);
            if (!evaluation.passed) {
                // If configured for hard block, prevent export
                if (evaluation.config.hardBlock) {
                    serviceLogger.warn({ caseId: id, reasons: evaluation.reasons }, 'Export blocked by release criteria');
                    throw new errors_js_1.UserFacingError(`Export blocked by release criteria: ${evaluation.reasons.map(r => r.message).join('; ')}`, 403, (0, node_crypto_1.randomUUID)());
                }
                else {
                    serviceLogger.info({ caseId: id, reasons: evaluation.reasons }, 'Export allowed despite unmet criteria (soft block)');
                }
            }
        }
        const caseRecord = await this.caseRepo.findById(id, tenantId);
        if (caseRecord) {
            // Log the export - this is a critical audit event
            await this.auditRepo.logAccess({
                tenantId,
                caseId: id,
                userId,
                action: 'export',
                resourceType: 'case',
                resourceId: id,
                ...auditContext,
            });
        }
        return caseRecord;
    }
    /**
     * Get case repository (for advanced operations)
     */
    getCaseRepo() {
        return this.caseRepo;
    }
    /**
     * Get audit repository (for advanced operations)
     */
    getAuditRepo() {
        return this.auditRepo;
    }
}
exports.CaseService = CaseService;
