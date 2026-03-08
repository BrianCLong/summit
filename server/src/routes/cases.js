"use strict";
/**
 * Case Routes - REST API endpoints for Case Spaces
 * Implements CRUD operations with integrated audit logging
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseRouter = void 0;
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const postgres_js_1 = require("../db/postgres.js");
const CaseService_js_1 = require("../cases/CaseService.js");
const CaseOverviewService_js_1 = require("../cases/overview/CaseOverviewService.js");
const CommentService_js_1 = require("../cases/comments/CommentService.js");
const chain_of_custody_js_1 = require("../cases/chain-of-custody.js");
const service_js_1 = require("../reporting/service.js");
const access_control_js_1 = require("../reporting/access-control.js");
const templates_js_1 = require("../cases/reporting/templates.js");
const metrics_js_1 = require("../monitoring/metrics.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const emit_js_1 = require("../audit/emit.js");
const routeLogger = logger_js_1.default.child({ name: 'CaseRoutes' });
const overviewService = new CaseOverviewService_js_1.CaseOverviewService((0, postgres_js_1.getPostgresPool)(), {
    ttlMs: Number.isFinite(Number(process.env.CASE_OVERVIEW_CACHE_TTL_MS))
        ? Number(process.env.CASE_OVERVIEW_CACHE_TTL_MS)
        : undefined,
    staleWhileRevalidateMs: Number.isFinite(Number(process.env.CASE_OVERVIEW_CACHE_SWR_MS))
        ? Number(process.env.CASE_OVERVIEW_CACHE_SWR_MS)
        : undefined,
});
exports.caseRouter = (0, express_1.Router)();
/**
 * Helper to extract tenant and user from request
 */
function getRequestContext(req) {
    // SEC-2025-002: Prioritize identity and tenant context from authenticated user object
    // populated by middleware, rather than untrusted headers to prevent spoofing.
    const tenantId = req.user?.tenantId ||
        req.user?.tenant_id ||
        req.tenant_id ||
        req.tenantContext?.tenantId ||
        (process.env.NODE_ENV === 'test' ? (req.headers['x-tenant-id'] || req.headers['x-tenant']) : null);
    const userId = req.user?.id ||
        req.user?.sub ||
        req.user?.email ||
        (process.env.NODE_ENV === 'test' ? req.headers['x-user-id'] : null);
    return {
        tenantId: tenantId ? String(tenantId) : null,
        userId: userId ? String(userId) : null,
    };
}
/**
 * Helper to extract audit context from request body
 */
function getAuditContext(body) {
    return {
        reason: body.reason,
        legalBasis: body.legalBasis,
        warrantId: body.warrantId,
        authorityReference: body.authorityReference,
        ipAddress: body._ipAddress,
        userAgent: body._userAgent,
        sessionId: body._sessionId,
        requestId: body._requestId,
        correlationId: body._correlationId,
    };
}
/**
 * GET /api/cases/:id/overview - Cached overview metrics served from materialized cache
 */
exports.caseRouter.get('/:id/overview', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const { id } = req.params;
        const reason = req.query.reason;
        const legalBasis = req.query.legalBasis;
        if (!reason) {
            return res.status(400).json({
                error: 'reason_required',
                message: 'You must provide a reason for accessing this case overview',
            });
        }
        if (!legalBasis) {
            return res.status(400).json({
                error: 'legal_basis_required',
                message: 'You must provide a legal basis for accessing this case overview',
            });
        }
        const pg = (0, postgres_js_1.getPostgresPool)();
        const caseExists = await pg.query(`SELECT 1 FROM maestro.cases WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
        if (caseExists.rowCount === 0) {
            return res.status(404).json({ error: 'case_not_found' });
        }
        const overview = await overviewService.getOverview(id, tenantId);
        routeLogger.info({
            caseId: id,
            tenantId,
            userId,
            cacheStatus: overview.cache.status,
        }, 'Case overview retrieved');
        res.json({
            ...overview,
            audit: {
                reason,
                legalBasis,
            },
        });
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to get case overview');
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/cases - Create a new case
 */
exports.caseRouter.post('/', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const input = {
            tenantId,
            title: req.body.title,
            description: req.body.description,
            status: req.body.status,
            compartment: req.body.compartment,
            policyLabels: req.body.policyLabels,
            metadata: req.body.metadata,
        };
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new CaseService_js_1.CaseService(pg);
        const auditContext = getAuditContext(req.body);
        const caseRecord = await service.createCase(input, userId, auditContext);
        metrics_js_1.goldenPathStepTotal.inc({
            step: 'investigation_created',
            status: 'success',
            tenant_id: tenantId
        });
        routeLogger.info({ caseId: caseRecord.id, tenantId, userId }, 'Case created via API');
        res.status(201).json(caseRecord);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to create case');
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/cases/:id - Get a case by ID
 */
exports.caseRouter.get('/:id', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const { id } = req.params;
        // Require reason and legal basis for viewing
        const reason = req.query.reason;
        const legalBasis = req.query.legalBasis;
        if (!reason) {
            return res.status(400).json({
                error: 'reason_required',
                message: 'You must provide a reason for accessing this case',
            });
        }
        if (!legalBasis) {
            return res.status(400).json({
                error: 'legal_basis_required',
                message: 'You must provide a legal basis for accessing this case',
            });
        }
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new CaseService_js_1.CaseService(pg);
        const auditContext = {
            reason,
            legalBasis,
            warrantId: req.query.warrantId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        };
        const caseRecord = await service.getCase(id, tenantId, userId, auditContext);
        if (!caseRecord) {
            return res.status(404).json({ error: 'case_not_found' });
        }
        res.json(caseRecord);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to get case');
        res.status(500).json({ error: error.message });
    }
});
/**
 * PUT /api/cases/:id - Update a case
 */
exports.caseRouter.put('/:id', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const { id } = req.params;
        // Require reason and legal basis for modification
        if (!req.body.reason) {
            return res.status(400).json({
                error: 'reason_required',
                message: 'You must provide a reason for modifying this case',
            });
        }
        if (!req.body.legalBasis) {
            return res.status(400).json({
                error: 'legal_basis_required',
                message: 'You must provide a legal basis for modifying this case',
            });
        }
        const input = {
            id,
            title: req.body.title,
            description: req.body.description,
            status: req.body.status,
            compartment: req.body.compartment,
            policyLabels: req.body.policyLabels,
            metadata: req.body.metadata,
        };
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new CaseService_js_1.CaseService(pg);
        const auditContext = getAuditContext(req.body);
        auditContext.ipAddress = req.ip;
        auditContext.userAgent = req.headers['user-agent'];
        const caseRecord = await service.updateCase(input, userId, tenantId, auditContext);
        if (!caseRecord) {
            return res.status(404).json({ error: 'case_not_found' });
        }
        res.json(caseRecord);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to update case');
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/cases - List cases
 */
exports.caseRouter.get('/', async (req, res) => {
    try {
        const { tenantId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new CaseService_js_1.CaseService(pg);
        const cases = await service.listCases({
            tenantId,
            status: req.query.status,
            compartment: req.query.compartment,
            policyLabels: req.query.policyLabels
                ? req.query.policyLabels.split(',')
                : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset
                ? parseInt(req.query.offset)
                : undefined,
        });
        res.json(cases);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to list cases');
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/cases/:id/archive - Archive a case
 */
exports.caseRouter.post('/:id/archive', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const { id } = req.params;
        // Require reason and legal basis for archiving
        if (!req.body.reason) {
            return res.status(400).json({
                error: 'reason_required',
                message: 'You must provide a reason for archiving this case',
            });
        }
        if (!req.body.legalBasis) {
            return res.status(400).json({
                error: 'legal_basis_required',
                message: 'You must provide a legal basis for archiving this case',
            });
        }
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new CaseService_js_1.CaseService(pg);
        const auditContext = getAuditContext(req.body);
        auditContext.ipAddress = req.ip;
        auditContext.userAgent = req.headers['user-agent'];
        const caseRecord = await service.archiveCase(id, userId, tenantId, auditContext);
        if (!caseRecord) {
            return res.status(404).json({ error: 'case_not_found' });
        }
        res.json(caseRecord);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to archive case');
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/cases/:id/export - Export case data
 */
exports.caseRouter.post('/:id/export', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const { id } = req.params;
        // Require reason and legal basis for export
        if (!req.body.reason) {
            return res.status(400).json({
                error: 'reason_required',
                message: 'You must provide a reason for exporting this case',
            });
        }
        if (!req.body.legalBasis) {
            return res.status(400).json({
                error: 'legal_basis_required',
                message: 'You must provide a legal basis for exporting this case',
            });
        }
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new CaseService_js_1.CaseService(pg);
        const auditContext = getAuditContext(req.body);
        auditContext.ipAddress = req.ip;
        auditContext.userAgent = req.headers['user-agent'];
        const caseRecord = await service.exportCase(id, tenantId, userId, auditContext);
        if (!caseRecord) {
            return res.status(404).json({ error: 'case_not_found' });
        }
        res.json(caseRecord);
    }
    catch (error) {
        // Handle specific user-facing errors
        if (error.name === 'UserFacingError') {
            return res.status(400).json({ error: error.message });
        }
        routeLogger.error({ error: error.message }, 'Failed to export case');
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/cases/:id/release-criteria - Configure release criteria
 */
exports.caseRouter.post('/:id/release-criteria', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const { id } = req.params;
        const config = req.body; // ReleaseCriteriaConfig
        const pg = (0, postgres_js_1.getPostgresPool)();
        // We need to instantiate the ReleaseCriteriaService.
        // Since CaseService initializes it privately, we should probably access it differently
        // or instantiate it directly here.
        // For now, let's instantiate it directly as we didn't expose it in CaseService.
        const { ReleaseCriteriaService } = await Promise.resolve().then(() => __importStar(require('../cases/ReleaseCriteriaService.js')));
        const service = new ReleaseCriteriaService(pg);
        await service.configure(id, tenantId, userId, config);
        res.status(200).json({ message: 'Release criteria configured' });
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to configure release criteria');
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/cases/:id/release-criteria/status - Get release criteria status
 */
exports.caseRouter.get('/:id/release-criteria/status', async (req, res) => {
    try {
        const { tenantId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        const { id } = req.params;
        const pg = (0, postgres_js_1.getPostgresPool)();
        const { ReleaseCriteriaService } = await Promise.resolve().then(() => __importStar(require('../cases/ReleaseCriteriaService.js')));
        const service = new ReleaseCriteriaService(pg);
        const result = await service.evaluate(id, tenantId);
        res.json(result);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to get release criteria status');
        res.status(500).json({ error: error.message });
    }
});
// ==================== COMMENTS ====================
/**
 * POST /api/cases/:id/comments - Add a comment
 */
exports.caseRouter.post('/:id/comments', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const { id } = req.params;
        const { content, metadata } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'content_required' });
        }
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new CommentService_js_1.CommentService(pg);
        const comment = await service.addComment({
            targetType: 'CASE',
            targetId: id,
            authorId: userId,
            content,
            metadata,
            tenantId,
        });
        await (0, emit_js_1.emitAuditEvent)({
            eventId: (0, node_crypto_1.randomUUID)(),
            occurredAt: new Date().toISOString(),
            actor: {
                type: 'user',
                id: userId,
                name: req.user?.username || req.user?.email || userId,
                ipAddress: req.ip,
            },
            action: {
                type: 'comment.added',
                outcome: 'success',
            },
            tenantId,
            target: {
                type: 'case_comment',
                id: comment.id,
                path: `cases/${id}`,
            },
            metadata: {
                caseId: id,
                commentId: comment.id,
                messageLength: String(content).length,
                userAgent: req.headers['user-agent'],
            },
        }, {
            correlationId: req.headers['x-request-id'],
            serviceId: 'cases',
        }).catch((error) => {
            routeLogger.warn({ error: error.message, caseId: id }, 'Failed to emit comment audit event');
        });
        res.status(201).json(comment);
    }
    catch (error) {
        // Handle specific user-facing errors
        if (error.name === 'UserFacingError') {
            return res.status(404).json({ error: error.message });
        }
        routeLogger.error({ error: error.message }, 'Failed to add comment');
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/cases/:id/comments - List comments
 */
exports.caseRouter.get('/:id/comments', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        const { id } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const offset = req.query.offset ? parseInt(req.query.offset) : undefined;
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new CommentService_js_1.CommentService(pg);
        const comments = await service.listComments(id, tenantId, limit, offset);
        res.json(comments);
    }
    catch (error) {
        if (error.name === 'UserFacingError') {
            return res.status(404).json({ error: error.message });
        }
        routeLogger.error({ error: error.message }, 'Failed to list comments');
        res.status(500).json({ error: error.message });
    }
});
// ==================== CHAIN OF CUSTODY ====================
/**
 * POST /api/cases/:id/evidence/event - Record chain of custody event
 */
exports.caseRouter.post('/:id/evidence/event', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const { id: caseId } = req.params;
        const { evidenceId, action, location, notes, verificationHash } = req.body;
        if (!evidenceId || !action) {
            return res.status(400).json({ error: 'evidenceId and action are required' });
        }
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new chain_of_custody_js_1.ChainOfCustodyService(pg);
        const event = await service.recordEvent({
            caseId,
            evidenceId,
            action,
            actorId: userId,
            location,
            notes,
            verificationHash,
        });
        res.status(201).json(event);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to record custody event');
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/cases/:id/evidence/:evidenceId/chain - Get chain of custody
 */
exports.caseRouter.get('/:id/evidence/:evidenceId/chain', async (req, res) => {
    try {
        const { evidenceId } = req.params;
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new chain_of_custody_js_1.ChainOfCustodyService(pg);
        const chain = await service.getChain(evidenceId);
        res.json(chain);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to get chain of custody');
        res.status(500).json({ error: error.message });
    }
});
// ==================== REPORTING ====================
/**
 * POST /api/cases/:id/report - Generate case report
 */
exports.caseRouter.post('/:id/report', async (req, res) => {
    try {
        const { tenantId, userId } = getRequestContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const { id } = req.params;
        const pg = (0, postgres_js_1.getPostgresPool)();
        const caseService = new CaseService_js_1.CaseService(pg);
        // Fetch case data to populate template
        // We pass minimal audit context since this is an internal fetch for reporting
        const caseData = await caseService.getCase(id, tenantId, userId, { reason: 'Report Generation', legalBasis: 'investigation' });
        if (!caseData) {
            return res.status(404).json({ error: 'case_not_found' });
        }
        // Fetch tasks
        const { TaskRepo } = await Promise.resolve().then(() => __importStar(require('../cases/workflow/repos/TaskRepo.js')));
        const taskRepo = new TaskRepo(pg);
        const tasks = await taskRepo.getCaseTasks(id);
        // Fetch evidence (Chain of Custody)
        const chainService = new chain_of_custody_js_1.ChainOfCustodyService(pg);
        const evidenceItems = await chainService.listEvidence(id);
        const evidence = evidenceItems.map(item => ({
            id: item.id,
            description: 'Evidence item', // Placeholder
            lastUpdate: item.lastUpdate
        }));
        const context = {
            case: caseData,
            tasks,
            evidence,
        };
        // Initialize reporting service
        const rules = [
            {
                resource: 'report',
                action: 'view',
                roles: ['investigator', 'admin', 'analyst']
            },
            {
                resource: 'report',
                action: 'deliver',
                roles: ['investigator', 'admin']
            }
        ];
        // Initialize with proper rules
        const accessControl = new access_control_js_1.AccessControlService(rules);
        const reportingService = (0, service_js_1.createReportingService)(accessControl);
        const userRoles = req.user?.roles || ['investigator'];
        const report = await reportingService.generate({
            template: templates_js_1.INVESTIGATION_SUMMARY_TEMPLATE,
            context,
            watermark: req.body.watermark,
        }, {
            userId,
            roles: userRoles,
        });
        res.json(report);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to generate report');
        res.status(500).json({ error: error.message });
    }
});
exports.default = exports.caseRouter;
