"use strict";
// @ts-nocheck
/**
 * Security Admin Routes
 *
 * REST API endpoints for key management and security features.
 *
 * SOC 2 Controls: CC6.1, CC6.7, CC7.2
 *
 * @module routes/security/security-admin
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const KeyRotationService_js_1 = require("../../security/KeyRotationService.js");
const PIIDetector_js_1 = require("../../privacy/PIIDetector.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const sensitive_context_js_1 = require("../../middleware/sensitive-context.js");
const router = express_1.default.Router();
const authz = new AuthorizationService_js_1.AuthorizationServiceImpl();
// ============================================================================
// Middleware
// ============================================================================
const buildPrincipal = (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
        return;
    }
    const principal = {
        kind: 'user',
        id: user.id,
        tenantId: req.headers['x-tenant-id'] || user.tenantId || 'default-tenant',
        roles: [user.role],
        scopes: [],
        user: {
            email: user.email,
            username: user.username,
        },
    };
    req.principal = principal;
    next();
};
const requireSecurityAdmin = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'admin', { type: 'security', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'security:admin',
            });
            return;
        }
        logger_js_1.default.error('Authorization error:', error);
        res.status(500).json({ error: 'Authorization service error' });
    }
};
// ============================================================================
// Key Management Routes
// ============================================================================
/**
 * GET /security/keys
 * List encryption keys
 */
router.get('/keys', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { purpose, status } = req.query;
        const envelope = KeyRotationService_js_1.keyRotationService.getKeyInventory(principal.tenantId, {
            purpose: purpose,
            status: status,
        });
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing keys:', error);
        res.status(500).json({ error: 'Failed to list keys', message: error.message });
    }
});
/**
 * POST /security/keys
 * Generate a new encryption key
 */
router.post('/keys', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { purpose, algorithm } = req.body;
        if (!purpose || !algorithm) {
            res.status(400).json({ error: 'purpose and algorithm are required' });
            return;
        }
        const envelope = await KeyRotationService_js_1.keyRotationService.generateKey(purpose, algorithm, principal.tenantId, principal.id);
        res.status(201).json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error generating key:', error);
        res.status(500).json({ error: 'Failed to generate key', message: error.message });
    }
});
/**
 * POST /security/keys/:id/rotate
 * Rotate an encryption key
 */
router.post('/keys/:id/rotate', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { reason } = req.body;
        const envelope = await KeyRotationService_js_1.keyRotationService.rotateKey(id, principal.id, reason);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error rotating key:', error);
        res.status(500).json({ error: 'Failed to rotate key', message: error.message });
    }
});
/**
 * POST /security/keys/:id/retire
 * Retire an encryption key
 */
router.post('/keys/:id/retire', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { reason } = req.body;
        const envelope = await KeyRotationService_js_1.keyRotationService.retireKey(id, principal.id, reason);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error retiring key:', error);
        res.status(500).json({ error: 'Failed to retire key', message: error.message });
    }
});
/**
 * POST /security/keys/:id/compromise
 * Mark a key as compromised
 */
router.post('/keys/:id/compromise', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) {
            res.status(400).json({ error: 'reason is required' });
            return;
        }
        const envelope = await KeyRotationService_js_1.keyRotationService.markCompromised(id, principal.id, reason);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error marking key compromised:', error);
        res.status(500).json({ error: 'Failed to mark key compromised', message: error.message });
    }
});
/**
 * GET /security/keys/expiring
 * Get keys nearing expiration
 */
router.get('/keys/expiring', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const daysAhead = req.query.days ? parseInt(req.query.days, 10) : 14;
        const envelope = KeyRotationService_js_1.keyRotationService.getKeysNearingExpiry(principal.tenantId, daysAhead);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting expiring keys:', error);
        res.status(500).json({ error: 'Failed to get expiring keys', message: error.message });
    }
});
/**
 * GET /security/keys/history
 * Get key rotation history
 */
router.get('/keys/history', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { keyId } = req.query;
        const envelope = KeyRotationService_js_1.keyRotationService.getRotationHistory(principal.tenantId, keyId);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting rotation history:', error);
        res.status(500).json({ error: 'Failed to get history', message: error.message });
    }
});
// ============================================================================
// Key Rotation Policy Routes
// ============================================================================
/**
 * GET /security/policies/rotation
 * Get key rotation policies
 */
router.get('/policies/rotation', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const envelope = KeyRotationService_js_1.keyRotationService.getRotationPolicies();
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting rotation policies:', error);
        res.status(500).json({ error: 'Failed to get policies', message: error.message });
    }
});
/**
 * PUT /security/policies/rotation/:purpose
 * Update a rotation policy
 */
router.put('/policies/rotation/:purpose', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const { purpose } = req.params;
        const policy = req.body;
        const envelope = KeyRotationService_js_1.keyRotationService.updateRotationPolicy(purpose, policy);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error updating rotation policy:', error);
        res.status(500).json({ error: 'Failed to update policy', message: error.message });
    }
});
// ============================================================================
// PII Scanning Routes
// ============================================================================
/**
 * POST /security/pii/scan
 * Scan data for PII
 */
router.post('/pii/scan', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, sensitive_context_js_1.sensitiveContextMiddleware, async (req, res) => {
    try {
        const { data, type = 'object', includeValue = false } = req.body;
        if (!data) {
            res.status(400).json({ error: 'data is required' });
            return;
        }
        let envelope;
        if (type === 'text') {
            envelope = await PIIDetector_js_1.piiDetector.scanText(data, { includeValue });
        }
        else {
            envelope = await PIIDetector_js_1.piiDetector.scanObject(data, { includeValue });
        }
        res.json({
            ...envelope,
            accessContext: req.sensitiveAccessContext,
        });
    }
    catch (error) {
        logger_js_1.default.error('Error scanning for PII:', error);
        res.status(500).json({ error: 'Failed to scan for PII', message: error.message });
    }
});
/**
 * GET /security/pii/categories
 * Get available PII categories
 */
router.get('/pii/categories', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const categories = PIIDetector_js_1.piiDetector.getPatternCategories();
        res.json({
            data: categories,
            meta: {
                generatedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_js_1.default.error('Error getting PII categories:', error);
        res.status(500).json({ error: 'Failed to get categories', message: error.message });
    }
});
/**
 * POST /security/pii/mask
 * Mask a PII value
 */
router.post('/pii/mask', auth_js_1.ensureAuthenticated, buildPrincipal, requireSecurityAdmin, async (req, res) => {
    try {
        const { value, category } = req.body;
        if (!value || !category) {
            res.status(400).json({ error: 'value and category are required' });
            return;
        }
        const masked = PIIDetector_js_1.piiDetector.maskValue(value, category);
        res.json({
            data: { masked },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_js_1.default.error('Error masking PII:', error);
        res.status(500).json({ error: 'Failed to mask value', message: error.message });
    }
});
exports.default = router;
