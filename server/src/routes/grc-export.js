"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const grc_export_service_js_1 = require("../integrations/grc/grc-export.service.js");
const tenantHeader_js_1 = require("../middleware/tenantHeader.js");
const auth_js_1 = require("../middleware/auth.js");
const permissions_js_1 = require("../middleware/permissions.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = (0, express_1.Router)();
// Apply middleware
router.use((0, tenantHeader_js_1.tenantHeader)());
router.use(auth_js_1.ensureAuthenticated);
/**
 * Export control mappings
 * GET /api/v1/grc/export/control-mappings
 */
const controlMappingsQuerySchema = zod_1.z.object({
    framework: zod_1.z.enum([
        'SOC2_TYPE_I',
        'SOC2_TYPE_II',
        'GDPR',
        'HIPAA',
        'SOX',
        'NIST_800_53',
        'ISO_27001',
        'CCPA',
        'PCI_DSS'
    ]).optional(),
    mode: zod_1.z.enum(['snapshot', 'delta']).default('snapshot'),
    sinceDate: zod_1.z.string().datetime().optional()
});
router.get('/control-mappings', (0, permissions_js_1.requirePermission)('grc:export:read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        // Validate query parameters
        const params = controlMappingsQuerySchema.parse(req.query);
        const request = {
            tenantId,
            framework: params.framework,
            mode: params.mode,
            sinceDate: params.sinceDate ? new Date(params.sinceDate) : undefined
        };
        const result = await grc_export_service_js_1.grcExportService.exportControlMappings(request);
        // Audit log the export
        logger_js_1.default.info('GRC control mappings exported', {
            tenantId,
            framework: params.framework,
            mode: params.mode,
            controlCount: result.controlMappings.length,
            requestId: req.requestId
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('GRC control mappings export failed', {
            error: error.message,
            requestId: req.requestId
        });
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid query parameters',
                    details: error.errors,
                    requestId: req.requestId
                }
            });
        }
        res.status(500).json({
            error: {
                code: 'EXPORT_FAILED',
                message: 'Failed to export control mappings',
                requestId: req.requestId
            }
        });
    }
});
/**
 * Generate evidence package
 * POST /api/v1/grc/export/evidence-package
 */
const evidencePackageSchema = zod_1.z.object({
    packageType: zod_1.z.enum(['soc2_type_ii', 'gdpr_ropa', 'hipaa_audit', 'custom']),
    periodStart: zod_1.z.string().datetime(),
    periodEnd: zod_1.z.string().datetime()
});
router.post('/evidence-package', (0, permissions_js_1.requirePermission)('grc:export:write'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user?.id || 'system';
        // Validate request body
        const params = evidencePackageSchema.parse(req.body);
        const evidencePackage = await grc_export_service_js_1.grcExportService.generateEvidencePackage(tenantId, params.packageType, new Date(params.periodStart), new Date(params.periodEnd), userId);
        // Audit log the package generation
        logger_js_1.default.info('GRC evidence package generated', {
            tenantId,
            packageId: evidencePackage.packageId,
            packageType: params.packageType,
            periodStart: params.periodStart,
            periodEnd: params.periodEnd,
            artifactCount: evidencePackage.contents.evidenceArtifacts,
            requestId: req.requestId
        });
        res.status(201).json(evidencePackage);
    }
    catch (error) {
        logger_js_1.default.error('GRC evidence package generation failed', {
            error: error.message,
            requestId: req.requestId
        });
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid request body',
                    details: error.errors,
                    requestId: req.requestId
                }
            });
        }
        res.status(500).json({
            error: {
                code: 'PACKAGE_GENERATION_FAILED',
                message: 'Failed to generate evidence package',
                requestId: req.requestId
            }
        });
    }
});
/**
 * Export verification results
 * GET /api/v1/grc/export/verification-results
 */
const verificationResultsQuerySchema = zod_1.z.object({
    controlId: zod_1.z.string().uuid().optional()
});
router.get('/verification-results', (0, permissions_js_1.requirePermission)('grc:export:read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        // Validate query parameters
        const params = verificationResultsQuerySchema.parse(req.query);
        const results = await grc_export_service_js_1.grcExportService.exportVerificationResults(tenantId, params.controlId);
        // Audit log the export
        logger_js_1.default.info('GRC verification results exported', {
            tenantId,
            controlId: params.controlId,
            resultCount: results.length,
            requestId: req.requestId
        });
        res.json({
            schemaVersion: '1.0.0',
            exportedAt: new Date().toISOString(),
            tenantId,
            controlId: params.controlId,
            results
        });
    }
    catch (error) {
        logger_js_1.default.error('GRC verification results export failed', {
            error: error.message,
            requestId: req.requestId
        });
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid query parameters',
                    details: error.errors,
                    requestId: req.requestId
                }
            });
        }
        res.status(500).json({
            error: {
                code: 'EXPORT_FAILED',
                message: 'Failed to export verification results',
                requestId: req.requestId
            }
        });
    }
});
/**
 * Health check endpoint
 * GET /api/v1/grc/export/health
 */
router.get('/health', async (req, res) => {
    res.json({
        status: 'healthy',
        service: 'grc-export',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
