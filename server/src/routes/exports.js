"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const ExportController_js_1 = require("../analytics/exports/ExportController.js");
const security_js_1 = require("../utils/security.js");
const WatermarkVerificationService_js_1 = require("../exports/WatermarkVerificationService.js");
const sensitive_context_js_1 = require("../middleware/sensitive-context.js");
const high_risk_approval_js_1 = require("../middleware/high-risk-approval.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
const watermarkVerificationService = new WatermarkVerificationService_js_1.WatermarkVerificationService();
router.post('/sign-manifest', auth_js_1.ensureAuthenticated, (0, auth_js_1.requirePermission)('export:investigations'), async (req, res) => {
    try {
        const { tenant, filters, timestamp } = req.body;
        // Create a canonical string representation of the export manifest
        const manifestString = JSON.stringify({ tenant, filters, timestamp });
        // In a real system, we'd use a private key from KMS/Secrets
        const secret = process.env.EXPORT_SIGNING_SECRET;
        if (!secret) {
            throw new Error('EXPORT_SIGNING_SECRET is not configured');
        }
        const signature = crypto_1.default
            .createHmac('sha256', secret)
            .update(manifestString)
            .digest('hex');
        res.json({
            signature,
            algorithm: 'hmac-sha256',
            manifest: { tenant, filters, timestamp }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to sign manifest' });
    }
});
router.post('/analytics/export', auth_js_1.ensureAuthenticated, (0, auth_js_1.requirePermission)('export:investigations'), sensitive_context_js_1.sensitiveContextMiddleware, high_risk_approval_js_1.highRiskApprovalMiddleware, ExportController_js_1.exportData);
router.post('/exports/:id/verify-watermark', auth_js_1.ensureAuthenticated, (0, auth_js_1.requirePermission)('export:investigations'), async (req, res) => {
    if (process.env.WATERMARK_VERIFY !== 'true') {
        return res.status(404).json({ error: 'Watermark verification not enabled' });
    }
    const { id } = req.params;
    const { artifactId, watermark } = req.body || {};
    // Security: Prevent path traversal in artifactId
    if (!(0, security_js_1.validateArtifactId)(artifactId)) {
        return res.status(400).json({ error: 'Invalid artifactId' });
    }
    try {
        const result = await watermarkVerificationService.verify({
            exportId: id,
            artifactId,
            watermark,
        });
        return res.json(result);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
});
exports.default = router;
