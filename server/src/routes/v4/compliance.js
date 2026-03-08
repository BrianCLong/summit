"use strict";
/**
 * Compliance API Routes (v4)
 *
 * Production-ready API endpoints for cross-domain compliance:
 * - HIPAA compliance management
 * - SOX compliance management
 * - Framework mappings and evidence collection
 *
 * @module routes/v4/compliance
 * @version 4.1.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceV4Router = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const rbac_js_1 = require("../../middleware/rbac.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const HIPAAControls_js_1 = require("../../compliance/frameworks/HIPAAControls.js");
const SOXControls_js_1 = require("../../compliance/frameworks/SOXControls.js");
const http_param_js_1 = require("../../utils/http-param.js");
// =============================================================================
// Service Initialization
// =============================================================================
let hipaaService = null;
let soxService = null;
const initializeServices = async () => {
    if (!hipaaService) {
        hipaaService = (0, HIPAAControls_js_1.createHIPAAComplianceService)();
        soxService = (0, SOXControls_js_1.createSOXComplianceService)();
        logger_js_1.default.info('Compliance services initialized');
    }
};
// =============================================================================
// Helper Functions
// =============================================================================
const getTenantId = (req) => {
    return req.tenantId || req.user?.tenantId || 'default';
};
const getUserId = (req) => {
    return req.user?.id || req.user?.id || 'anonymous';
};
const wrapResponse = (data, req) => {
    return {
        data,
        metadata: {
            requestId: req.correlationId || (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            version: '4.1.0',
        },
        governance: {
            action: 'ALLOW',
            reasons: ['Compliance data access authorized'],
            policyIds: ['compliance-v4'],
            metadata: {
                timestamp: new Date().toISOString(),
                evaluator: 'compliance-router',
                latencyMs: 0,
                simulation: false,
            },
            provenance: {
                origin: 'compliance-api-v4',
                confidence: 1.0,
            },
        },
    };
};
// =============================================================================
// Router
// =============================================================================
const router = (0, express_1.Router)();
exports.complianceV4Router = router;
// Initialize services middleware
router.use(async (_req, _res, next) => {
    try {
        await initializeServices();
        next();
    }
    catch (error) {
        logger_js_1.default.error({ error }, 'Failed to initialize compliance services');
        next(error);
    }
});
// =============================================================================
// Framework Information Endpoints
// =============================================================================
/**
 * @swagger
 * /api/v4/compliance/frameworks:
 *   get:
 *     summary: List available compliance frameworks
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of frameworks
 */
router.get('/frameworks', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    const frameworks = [
        {
            ...HIPAAControls_js_1.HIPAA_FRAMEWORK,
            controlCount: HIPAAControls_js_1.ALL_HIPAA_CONTROLS.length,
            enabled: true,
        },
        {
            ...SOXControls_js_1.SOX_FRAMEWORK,
            controlCount: SOXControls_js_1.ALL_SOX_CONTROLS.length,
            enabled: true,
        },
    ];
    res.json(wrapResponse(frameworks, req));
});
// =============================================================================
// HIPAA Endpoints
// =============================================================================
/**
 * @swagger
 * /api/v4/compliance/hipaa/controls:
 *   get:
 *     summary: List all HIPAA controls
 *     tags: [Compliance - HIPAA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: automatable
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of HIPAA controls
 */
router.get('/hipaa/controls', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    let controls = [...HIPAAControls_js_1.ALL_HIPAA_CONTROLS];
    // Filter by category
    if (req.query.category) {
        controls = controls.filter(c => c.category === req.query.category);
    }
    // Filter by automatable
    if (req.query.automatable !== undefined) {
        const automatable = req.query.automatable === 'true';
        controls = controls.filter(c => c.automatable === automatable);
    }
    res.json(wrapResponse({
        controls,
        total: controls.length,
        categories: HIPAAControls_js_1.HIPAA_FRAMEWORK.categories,
    }, req));
});
/**
 * @swagger
 * /api/v4/compliance/hipaa/controls/{id}:
 *   get:
 *     summary: Get HIPAA control details
 *     tags: [Compliance - HIPAA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Control details
 *       404:
 *         description: Control not found
 */
router.get('/hipaa/controls/:id', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    const control = HIPAAControls_js_1.ALL_HIPAA_CONTROLS.find(c => c.id === req.params.id);
    if (!control) {
        return res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: `HIPAA control not found: ${req.params.id}`,
            },
        });
    }
    res.json(wrapResponse(control, req));
});
/**
 * @swagger
 * /api/v4/compliance/hipaa/phi-identifiers:
 *   get:
 *     summary: Get list of PHI identifiers
 *     tags: [Compliance - HIPAA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of PHI identifiers
 */
router.get('/hipaa/phi-identifiers', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    res.json(wrapResponse({
        identifiers: HIPAAControls_js_1.PHI_IDENTIFIERS,
        total: HIPAAControls_js_1.PHI_IDENTIFIERS.length,
        description: 'The 18 HIPAA-defined identifiers that constitute Protected Health Information (PHI)',
    }, req));
});
/**
 * @swagger
 * /api/v4/compliance/hipaa/assess:
 *   post:
 *     summary: Run HIPAA compliance assessment
 *     tags: [Compliance - HIPAA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *               includeEvidence:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Assessment results
 */
router.post('/hipaa/assess', (0, rbac_js_1.requirePermission)('compliance:assess'), async (req, res) => {
    const tenantId = getTenantId(req);
    const { categories } = req.body;
    const assessment = await hipaaService.performAssessment(tenantId, { categories });
    logger_js_1.default.info({
        tenantId,
        framework: 'HIPAA',
        score: (assessment.summary.compliant / assessment.summary.totalControls) * 100,
        assessedBy: getUserId(req),
    }, 'HIPAA assessment completed');
    res.json(wrapResponse(assessment, req));
});
/**
 * @swagger
 * /api/v4/compliance/hipaa/history:
 *   get:
 *     summary: Get HIPAA assessment history
 *     tags: [Compliance - HIPAA]
 */
router.get('/hipaa/history', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    const tenantId = getTenantId(req);
    const history = await hipaaService.getAssessmentHistory(tenantId);
    res.json(wrapResponse(history, req));
});
/**
 * @swagger
 * /api/v4/compliance/hipaa/assessments/{id}:
 *   get:
 *     summary: Get specific HIPAA assessment
 *     tags: [Compliance - HIPAA]
 */
router.get('/hipaa/assessments/:id', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    const assessment = await hipaaService.getAssessment((0, http_param_js_1.firstStringOr)(req.params.id, ''));
    if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(wrapResponse(assessment, req));
});
/**
 * @swagger
 * /api/v4/compliance/hipaa/evidence:
 *   post:
 *     summary: Submit evidence for HIPAA control
 *     tags: [Compliance - HIPAA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - controlId
 *               - type
 *               - description
 *             properties:
 *               controlId:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Evidence recorded
 */
router.post('/hipaa/evidence', (0, rbac_js_1.requirePermission)('compliance:evidence:submit'), async (req, res) => {
    const control = HIPAAControls_js_1.ALL_HIPAA_CONTROLS.find(c => c.id === req.body.controlId);
    if (!control) {
        return res.status(400).json({
            error: {
                code: 'INVALID_CONTROL',
                message: `Unknown HIPAA control: ${req.body.controlId}`,
            },
        });
    }
    const evidence = {
        id: `evidence-${(0, crypto_1.randomUUID)()}`,
        controlId: req.body.controlId,
        framework: 'HIPAA',
        type: req.body.type,
        description: req.body.description,
        collectedAt: new Date().toISOString(),
        collectedBy: getUserId(req),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'valid',
        attachments: req.body.attachments || [],
    };
    logger_js_1.default.info({
        evidenceId: evidence.id,
        controlId: evidence.controlId,
        framework: 'HIPAA',
        submittedBy: evidence.collectedBy,
    }, 'HIPAA evidence submitted');
    res.status(201).json(wrapResponse(evidence, req));
});
// =============================================================================
// SOX Endpoints
// =============================================================================
/**
 * @swagger
 * /api/v4/compliance/sox/controls:
 *   get:
 *     summary: List all SOX controls
 *     tags: [Compliance - SOX]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *           description: ITGC domain filter
 *     responses:
 *       200:
 *         description: List of SOX controls
 */
router.get('/sox/controls', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    let controls = [...SOXControls_js_1.ALL_SOX_CONTROLS];
    // Filter by category
    if (req.query.category) {
        controls = controls.filter(c => c.category === req.query.category);
    }
    // Filter by ITGC domain (subcategory)
    if (req.query.domain) {
        controls = controls.filter(c => c.subcategory === req.query.domain);
    }
    res.json(wrapResponse({
        controls,
        total: controls.length,
        categories: SOXControls_js_1.SOX_FRAMEWORK.categories,
        itgcDomains: SOXControls_js_1.ITGC_DOMAINS,
    }, req));
});
/**
 * @swagger
 * /api/v4/compliance/sox/controls/{id}:
 *   get:
 *     summary: Get SOX control details
 *     tags: [Compliance - SOX]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Control details
 *       404:
 *         description: Control not found
 */
router.get('/sox/controls/:id', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    const control = SOXControls_js_1.ALL_SOX_CONTROLS.find(c => c.id === req.params.id);
    if (!control) {
        return res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: `SOX control not found: ${req.params.id}`,
            },
        });
    }
    res.json(wrapResponse(control, req));
});
/**
 * @swagger
 * /api/v4/compliance/sox/itgc-domains:
 *   get:
 *     summary: Get IT General Controls domains
 *     tags: [Compliance - SOX]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ITGC domains
 */
router.get('/sox/itgc-domains', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    res.json(wrapResponse({
        domains: SOXControls_js_1.ITGC_DOMAINS,
        description: 'IT General Controls (ITGC) domains for SOX compliance',
    }, req));
});
/**
 * @swagger
 * /api/v4/compliance/sox/assess:
 *   post:
 *     summary: Run SOX compliance assessment
 *     tags: [Compliance - SOX]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sections:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: ['302', '404', '409', 'ITGC']
 *               includeEvidence:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Assessment results
 */
router.post('/sox/assess', (0, rbac_js_1.requirePermission)('compliance:assess'), async (req, res) => {
    const tenantId = getTenantId(req);
    const assessment = await soxService.performAssessment(tenantId, {
        sections: req.body.sections,
    });
    logger_js_1.default.info({
        tenantId,
        framework: 'SOX',
        score: (assessment.summary.effective / assessment.summary.totalControls) * 100,
        assessedBy: getUserId(req),
    }, 'SOX assessment completed');
    res.json(wrapResponse(assessment, req));
});
/**
 * @swagger
 * /api/v4/compliance/sox/history:
 *   get:
 *     summary: Get SOX assessment history
 *     tags: [Compliance - SOX]
 */
router.get('/sox/history', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    const tenantId = getTenantId(req);
    const history = await soxService.getAssessmentHistory(tenantId);
    res.json(wrapResponse(history, req));
});
/**
 * @swagger
 * /api/v4/compliance/sox/assessments/{id}:
 *   get:
 *     summary: Get specific SOX assessment
 *     tags: [Compliance - SOX]
 */
router.get('/sox/assessments/:id', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    const assessment = await soxService.getAssessment((0, http_param_js_1.firstStringOr)(req.params.id, ''));
    if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(wrapResponse(assessment, req));
});
/**
 * @swagger
 * /api/v4/compliance/sox/evidence:
 *   post:
 *     summary: Submit evidence for SOX control
 *     tags: [Compliance - SOX]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - controlId
 *               - type
 *               - description
 *             properties:
 *               controlId:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Evidence recorded
 */
router.post('/sox/evidence', (0, rbac_js_1.requirePermission)('compliance:evidence:submit'), async (req, res) => {
    const control = SOXControls_js_1.ALL_SOX_CONTROLS.find(c => c.id === req.body.controlId);
    if (!control) {
        return res.status(400).json({
            error: {
                code: 'INVALID_CONTROL',
                message: `Unknown SOX control: ${req.body.controlId}`,
            },
        });
    }
    const evidence = {
        id: `evidence-${(0, crypto_1.randomUUID)()}`,
        controlId: req.body.controlId,
        framework: 'SOX',
        type: req.body.type,
        description: req.body.description,
        collectedAt: new Date().toISOString(),
        collectedBy: getUserId(req),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'valid',
        attachments: req.body.attachments || [],
    };
    logger_js_1.default.info({
        evidenceId: evidence.id,
        controlId: evidence.controlId,
        framework: 'SOX',
        submittedBy: evidence.collectedBy,
    }, 'SOX evidence submitted');
    res.status(201).json(wrapResponse(evidence, req));
});
// =============================================================================
// Cross-Framework Endpoints
// =============================================================================
/**
 * @swagger
 * /api/v4/compliance/mappings:
 *   get:
 *     summary: Get control mappings across frameworks
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sourceFramework
 *         schema:
 *           type: string
 *           enum: [HIPAA, SOX, SOC2, ISO27001]
 *       - in: query
 *         name: targetFramework
 *         schema:
 *           type: string
 *           enum: [HIPAA, SOX, SOC2, ISO27001]
 *     responses:
 *       200:
 *         description: Control mappings
 */
router.get('/mappings', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    // Return sample mappings between frameworks
    const mappings = [
        {
            source: { framework: 'HIPAA', control: 'HIPAA-AS-001' },
            target: { framework: 'SOC2', control: 'CC6.1' },
            relationship: 'equivalent',
            description: 'Access control requirements align',
        },
        {
            source: { framework: 'SOX', control: 'SOX-ITGC-AC-001' },
            target: { framework: 'SOC2', control: 'CC6.1' },
            relationship: 'partial',
            description: 'Logical access controls overlap',
        },
        {
            source: { framework: 'HIPAA', control: 'HIPAA-TS-003' },
            target: { framework: 'ISO27001', control: 'A.10.1.1' },
            relationship: 'equivalent',
            description: 'Encryption requirements align',
        },
    ];
    // Filter by framework if specified
    let filteredMappings = mappings;
    if (req.query.sourceFramework) {
        filteredMappings = filteredMappings.filter(m => m.source.framework === req.query.sourceFramework);
    }
    if (req.query.targetFramework) {
        filteredMappings = filteredMappings.filter(m => m.target.framework === req.query.targetFramework);
    }
    res.json(wrapResponse({
        mappings: filteredMappings,
        total: filteredMappings.length,
    }, req));
});
/**
 * @swagger
 * /api/v4/compliance/dashboard:
 *   get:
 *     summary: Get compliance dashboard data
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', (0, rbac_js_1.requirePermission)('compliance:read'), async (req, res) => {
    const tenantId = getTenantId(req);
    const hipaaLatest = await hipaaService.getAssessmentHistory(tenantId);
    const soxLatest = await soxService.getAssessmentHistory(tenantId);
    const hipaa = hipaaLatest[0];
    const sox = soxLatest[0];
    const dashboard = {
        tenantId,
        timestamp: new Date().toISOString(),
        frameworks: [
            {
                id: 'HIPAA',
                name: 'HIPAA',
                enabled: true,
                score: hipaa ? (hipaa.summary.compliant / hipaa.summary.totalControls) * 100 : 0,
                trend: 'stable',
                lastAssessment: hipaa?.assessedAt || null,
                criticalGaps: hipaa?.summary.nonCompliant || 0,
            },
            {
                id: 'SOX',
                name: 'SOX',
                enabled: true,
                score: sox ? (sox.summary.effective / sox.summary.totalControls) * 100 : 0,
                trend: 'stable',
                lastAssessment: sox?.assessedAt || null,
                criticalGaps: sox?.summary.ineffective || 0,
            },
        ],
        upcomingDeadlines: [
            {
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                framework: 'SOX',
                description: 'Q4 ITGC testing deadline',
            },
            {
                date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                framework: 'HIPAA',
                description: 'Annual risk assessment due',
            },
        ],
        recentActivity: [
            ...hipaaLatest.slice(0, 3).map((h) => ({
                timestamp: h.assessedAt,
                action: 'Assessment completed',
                framework: 'HIPAA',
                control: null,
            })),
            ...soxLatest.slice(0, 3).map((s) => ({
                timestamp: s.assessedAt,
                action: 'Assessment completed',
                framework: 'SOX',
                control: null,
            })),
        ]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5),
    };
    res.json(wrapResponse(dashboard, req));
});
/**
 * @swagger
 * /api/v4/compliance/health:
 *   get:
 *     summary: Compliance service health check
 *     tags: [Compliance]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', async (_req, res) => {
    res.json({
        status: 'healthy',
        frameworks: {
            HIPAA: {
                status: 'active',
                controls: HIPAAControls_js_1.ALL_HIPAA_CONTROLS.length,
            },
            SOX: {
                status: 'active',
                controls: SOXControls_js_1.ALL_SOX_CONTROLS.length,
            },
        },
        timestamp: new Date().toISOString(),
        version: '4.1.0',
    });
});
exports.default = router;
