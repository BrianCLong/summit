"use strict";
/**
 * Federation API Routes
 *
 * Express routes for federation operations:
 * - Push sharing
 * - Pull queries
 * - Subscription management
 * - Agreement management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("../models/types.js");
const federation_manager_js_1 = require("../services/federation-manager.js");
const policy_evaluator_js_1 = require("../services/policy-evaluator.js");
const redaction_engine_js_1 = require("../services/redaction-engine.js");
const provenance_tracker_js_1 = require("../services/provenance-tracker.js");
const audit_logger_js_1 = require("../services/audit-logger.js");
const stix_taxii_js_1 = require("../protocols/stix-taxii.js");
const logger = (0, pino_1.default)({ name: 'api-routes' });
const router = express_1.default.Router();
// Initialize services
const policyEvaluator = new policy_evaluator_js_1.PolicyEvaluator();
const redactionEngine = new redaction_engine_js_1.RedactionEngine();
const provenanceTracker = new provenance_tracker_js_1.ProvenanceTracker();
const auditLogger = new audit_logger_js_1.AuditLogger();
const federationManager = new federation_manager_js_1.FederationManager(policyEvaluator, redactionEngine, provenanceTracker);
const stixMapper = new stix_taxii_js_1.StixTaxiiMapper();
// Mock storage (in production, use database)
const agreements = new Map();
const availableObjects = []; // Mock data source
/**
 * Middleware: Validate request
 */
function validateRequest(req, res, next) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}
/**
 * Middleware: Extract audit context
 */
function extractAuditContext(req) {
    return {
        userId: req.headers['x-user-id'],
        partnerId: req.headers['x-partner-id'],
        requestId: req.headers['x-request-id'],
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
    };
}
/**
 * POST /api/v1/share/push
 * Push share objects to a partner
 */
router.post('/api/v1/share/push', [
    (0, express_validator_1.body)('agreementId').isUUID(),
    (0, express_validator_1.body)('objects').isArray(),
    (0, express_validator_1.body)('sharedBy').isString(),
], validateRequest, async (req, res) => {
    try {
        const { agreementId, objects, sharedBy, channelId } = req.body;
        // Get agreement
        const agreement = agreements.get(agreementId);
        if (!agreement) {
            return res.status(404).json({ error: 'Agreement not found' });
        }
        // Validate sharing mode
        if (agreement.sharingMode !== types_js_1.SharingMode.PUSH) {
            return res.status(400).json({ error: 'Agreement does not support PUSH' });
        }
        const context = extractAuditContext(req);
        context.agreementId = agreementId;
        context.channelId = channelId;
        // Execute share
        const sharePackage = await federationManager.pushShare({ agreementId, objects, sharedBy, channelId }, agreement);
        // Audit log
        auditLogger.logSharePush(context, sharePackage.objects.length, sharePackage.objects.map((o) => o.type), sharePackage.provenanceLinks, true);
        res.status(200).json({
            packageId: sharePackage.id,
            objectCount: sharePackage.objects.length,
            sharedAt: sharePackage.sharedAt,
        });
    }
    catch (error) {
        logger.error({ error }, 'Push share failed');
        const context = extractAuditContext(req);
        auditLogger.logSharePush(context, 0, [], [], false, error instanceof Error ? error.message : 'Unknown error');
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/v1/share/pull
 * Pull query for available objects
 */
router.get('/api/v1/share/pull', [
    (0, express_validator_1.query)('agreementId').isUUID(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 1000 }),
    (0, express_validator_1.query)('offset').optional().isInt({ min: 0 }),
], validateRequest, async (req, res) => {
    try {
        const { agreementId, limit, offset, objectTypes } = req.query;
        // Get agreement
        const agreement = agreements.get(agreementId);
        if (!agreement) {
            return res.status(404).json({ error: 'Agreement not found' });
        }
        // Validate sharing mode
        if (agreement.sharingMode !== types_js_1.SharingMode.PULL) {
            return res.status(400).json({ error: 'Agreement does not support PULL' });
        }
        const context = extractAuditContext(req);
        context.agreementId = agreementId;
        // Execute pull query
        const results = await federationManager.pullQuery({
            agreementId: agreementId,
            limit: limit ? parseInt(limit) : 100,
            offset: offset ? parseInt(offset) : 0,
            objectTypes: objectTypes
                ? objectTypes.split(',')
                : undefined,
        }, agreement, availableObjects);
        // Audit log
        auditLogger.logSharePull(context, results.length, results.map((o) => o.type), true);
        res.status(200).json({
            objects: results,
            count: results.length,
        });
    }
    catch (error) {
        logger.error({ error }, 'Pull query failed');
        const context = extractAuditContext(req);
        auditLogger.logSharePull(context, 0, [], false, error instanceof Error ? error.message : 'Unknown error');
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /api/v1/agreements
 * Create a new sharing agreement
 */
router.post('/api/v1/agreements', [
    (0, express_validator_1.body)('name').isString(),
    (0, express_validator_1.body)('sourcePartnerId').isUUID(),
    (0, express_validator_1.body)('targetPartnerId').isUUID(),
    (0, express_validator_1.body)('policyConstraints').isObject(),
    (0, express_validator_1.body)('sharingMode').isIn(Object.values(types_js_1.SharingMode)),
], validateRequest, async (req, res) => {
    try {
        const agreement = {
            id: crypto.randomUUID(),
            ...req.body,
            status: types_js_1.AgreementStatus.DRAFT,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Validate agreement
        const validation = policyEvaluator.validateAgreement(agreement);
        if (!validation.valid) {
            return res.status(400).json({ errors: validation.errors });
        }
        // Store agreement
        agreements.set(agreement.id, agreement);
        const context = extractAuditContext(req);
        auditLogger.logAgreementCreate(context, agreement.id, true);
        res.status(201).json(agreement);
    }
    catch (error) {
        logger.error({ error }, 'Agreement creation failed');
        const context = extractAuditContext(req);
        auditLogger.logAgreementCreate(context, '', false, error instanceof Error ? error.message : 'Unknown error');
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/v1/agreements/:id
 * Get agreement by ID
 */
router.get('/api/v1/agreements/:id', async (req, res) => {
    const { id } = req.params;
    const agreement = agreements.get(id);
    if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
    }
    res.status(200).json(agreement);
});
/**
 * GET /api/v1/agreements
 * List all agreements
 */
router.get('/api/v1/agreements', async (req, res) => {
    const allAgreements = Array.from(agreements.values());
    res.status(200).json({
        agreements: allAgreements,
        count: allAgreements.length,
    });
});
/**
 * PUT /api/v1/agreements/:id
 * Update agreement
 */
router.put('/api/v1/agreements/:id', async (req, res) => {
    const { id } = req.params;
    const agreement = agreements.get(id);
    if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
    }
    const updated = {
        ...agreement,
        ...req.body,
        id, // Preserve ID
        updatedAt: new Date(),
    };
    // Validate
    const validation = policyEvaluator.validateAgreement(updated);
    if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
    }
    agreements.set(id, updated);
    const context = extractAuditContext(req);
    auditLogger.logAgreementModify(context, id, true);
    res.status(200).json(updated);
});
/**
 * GET /api/v1/audit
 * Query audit logs
 */
router.get('/api/v1/audit', async (req, res) => {
    const { startDate, endDate, operation, agreementId } = req.query;
    const logs = auditLogger.query({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        operation: operation,
        agreementId: agreementId,
    });
    res.status(200).json({
        logs,
        count: logs.length,
    });
});
/**
 * GET /api/v1/stix/bundle/:packageId
 * Get share package as STIX bundle
 */
router.get('/api/v1/stix/bundle/:packageId', async (req, res) => {
    // Mock: retrieve package by ID
    // In production, fetch from storage
    res.status(404).json({ error: 'Package not found' });
});
/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'federation-service',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
