"use strict";
/**
 * Governance API Routes (Approvals, Evaluations, Audit)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceRouter = void 0;
const express_1 = require("express");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const ApprovalService_js_1 = require("../governance/ApprovalService.js");
const AuditService_js_1 = require("../governance/AuditService.js");
const EvaluationService_js_1 = require("../evaluation/EvaluationService.js");
exports.governanceRouter = (0, express_1.Router)();
// ============================================================================
// Approvals
// ============================================================================
// List approvals
exports.governanceRouter.get('/approvals', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { modelVersionId, environment, status, requestedBy, reviewedBy, limit, offset } = req.query;
    const result = await ApprovalService_js_1.approvalService.listApprovals({
        modelVersionId: modelVersionId,
        environment: environment,
        status: status,
        requestedBy: requestedBy,
        reviewedBy: reviewedBy,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
    });
    res.json(result);
}));
// Get approval
exports.governanceRouter.get('/approvals/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const approval = await ApprovalService_js_1.approvalService.getApproval(req.params.id);
    res.json(approval);
}));
// Request approval
exports.governanceRouter.post('/approvals', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { modelVersionId, environment, requestedBy, evaluationRequirements } = req.body;
    const approval = await ApprovalService_js_1.approvalService.requestApproval({
        modelVersionId,
        environment,
        requestedBy,
        evaluationRequirements,
    });
    res.status(201).json(approval);
}));
// Review approval
exports.governanceRouter.post('/approvals/:id/review', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { reviewedBy, status, notes, rejectionReason, expiresInDays } = req.body;
    const approval = await ApprovalService_js_1.approvalService.reviewApproval({
        approvalId: req.params.id,
        reviewedBy,
        status,
        notes,
        rejectionReason,
        expiresInDays,
    });
    res.json(approval);
}));
// Revoke approval
exports.governanceRouter.post('/approvals/:id/revoke', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { revokedBy, reason } = req.body;
    const approval = await ApprovalService_js_1.approvalService.revokeApproval(req.params.id, revokedBy, reason);
    res.json(approval);
}));
// Check if approved
exports.governanceRouter.get('/approvals/check/:modelVersionId/:environment', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { modelVersionId, environment } = req.params;
    const isApproved = await ApprovalService_js_1.approvalService.isApproved(modelVersionId, environment);
    res.json({ isApproved, modelVersionId, environment });
}));
// ============================================================================
// Evaluations
// ============================================================================
// List evaluation suites
exports.governanceRouter.get('/evaluations/suites', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const suites = EvaluationService_js_1.evaluationService.listEvaluationSuites();
    res.json({ suites });
}));
// Get evaluation suite
exports.governanceRouter.get('/evaluations/suites/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const suite = EvaluationService_js_1.evaluationService.getEvaluationSuite(req.params.id);
    if (!suite) {
        res.status(404).json({ error: { message: 'Evaluation suite not found' } });
        return;
    }
    res.json(suite);
}));
// List evaluation runs
exports.governanceRouter.get('/evaluations/runs', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { modelVersionId, evaluationSuiteId, status, limit, offset } = req.query;
    const result = await EvaluationService_js_1.evaluationService.listEvaluationRuns({
        modelVersionId: modelVersionId,
        evaluationSuiteId: evaluationSuiteId,
        status: status,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
    });
    res.json(result);
}));
// Get evaluation run
exports.governanceRouter.get('/evaluations/runs/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const run = await EvaluationService_js_1.evaluationService.getEvaluationRun(req.params.id);
    res.json(run);
}));
// Start evaluation
exports.governanceRouter.post('/evaluations/runs', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { modelVersionId, evaluationSuiteId, triggeredBy, triggerType } = req.body;
    const run = await EvaluationService_js_1.evaluationService.startEvaluation({
        modelVersionId,
        evaluationSuiteId,
        triggeredBy,
        triggerType: triggerType || 'manual',
    });
    res.status(201).json(run);
}));
// Cancel evaluation
exports.governanceRouter.post('/evaluations/runs/:id/cancel', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const run = await EvaluationService_js_1.evaluationService.cancelEvaluation(req.params.id);
    res.json(run);
}));
// Check promotion readiness
exports.governanceRouter.get('/evaluations/readiness/:modelVersionId', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const readiness = await EvaluationService_js_1.evaluationService.checkPromotionReadiness(req.params.modelVersionId);
    res.json(readiness);
}));
// ============================================================================
// Audit
// ============================================================================
// List audit events
exports.governanceRouter.get('/audit', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { entityType, entityId, actorId, eventType, tenantId, startDate, endDate, limit, offset, } = req.query;
    const result = await AuditService_js_1.auditService.listAuditEvents({
        entityType: entityType,
        entityId: entityId,
        actorId: actorId,
        eventType: eventType,
        tenantId: tenantId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
    });
    res.json(result);
}));
// Get audit event
exports.governanceRouter.get('/audit/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const event = await AuditService_js_1.auditService.getAuditEvent(req.params.id);
    res.json(event);
}));
// Get entity audit trail
exports.governanceRouter.get('/audit/trail/:entityType/:entityId', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { limit } = req.query;
    const events = await AuditService_js_1.auditService.getEntityAuditTrail(entityType, entityId, limit ? parseInt(limit) : undefined);
    res.json({ events });
}));
// Get actor activity
exports.governanceRouter.get('/audit/activity/:actorId', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { actorId } = req.params;
    const { limit } = req.query;
    const events = await AuditService_js_1.auditService.getActorActivity(actorId, limit ? parseInt(limit) : undefined);
    res.json({ events });
}));
