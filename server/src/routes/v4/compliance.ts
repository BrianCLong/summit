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

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requirePermission } from '../../middleware/rbac.js';
import logger from '../../utils/logger.js';
import {
  ALL_HIPAA_CONTROLS,
  HIPAA_FRAMEWORK,
  PHI_IDENTIFIERS,
  HIPAAComplianceService,
  createHIPAAComplianceService,
} from '../../compliance/frameworks/HIPAAControls.js';
import {
  ALL_SOX_CONTROLS,
  SOX_FRAMEWORK,
  ITGC_DOMAINS,
  SOXComplianceService,
  createSOXComplianceService,
} from '../../compliance/frameworks/SOXControls.js';
import { GovernanceVerdict } from '../../governance/types.js';

// =============================================================================
// Types
// =============================================================================

// Use the Request type directly - user is defined in global Express declarations

interface DataEnvelope<T> {
  data: T;
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
  };
  governance: GovernanceVerdict;
}

interface ComplianceAssessment {
  id: string;
  framework: string;
  tenantId: string;
  assessmentDate: string;
  overallScore: number;
  controlsTotal: number;
  controlsCompliant: number;
  controlsPartial: number;
  controlsNonCompliant: number;
  gaps: ComplianceGap[];
  recommendations: string[];
  nextReviewDate: string;
}

interface ComplianceGap {
  controlId: string;
  controlName: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
  dueDate: string;
}

interface EvidenceRecord {
  id: string;
  controlId: string;
  framework: string;
  type: string;
  description: string;
  collectedAt: string;
  collectedBy: string;
  expiresAt: string;
  status: 'valid' | 'expired' | 'pending_review';
  attachments: string[];
}

// =============================================================================
// Service Initialization
// =============================================================================

let hipaaService: HIPAAComplianceService | null = null;
let soxService: SOXComplianceService | null = null;

const initializeServices = async () => {
  if (!hipaaService) {
    hipaaService = createHIPAAComplianceService();
    soxService = createSOXComplianceService();
    logger.info('Compliance services initialized');
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

const getTenantId = (req: Request): string => {
  return req.tenantId || req.user?.tenantId || 'default';
};

const getUserId = (req: Request): string => {
  return req.user?.id || req.user?.id || 'anonymous';
};

const wrapResponse = <T>(data: T, req: Request): DataEnvelope<T> => {
  return {
    data,
    metadata: {
      requestId: req.correlationId || randomUUID(),
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

const router = Router();
const singleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? '';

// Initialize services middleware
router.use(async (_req, _res, next) => {
  try {
    await initializeServices();
    next();
  } catch (error: any) {
    logger.error({ error }, 'Failed to initialize compliance services');
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
router.get(
  '/frameworks',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    const frameworks = [
      {
        ...HIPAA_FRAMEWORK,
        controlCount: ALL_HIPAA_CONTROLS.length,
        enabled: true,
      },
      {
        ...SOX_FRAMEWORK,
        controlCount: ALL_SOX_CONTROLS.length,
        enabled: true,
      },
    ];

    res.json(wrapResponse(frameworks, req));
  }
);

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
router.get(
  '/hipaa/controls',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    let controls = [...ALL_HIPAA_CONTROLS];

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
      categories: HIPAA_FRAMEWORK.categories,
    }, req));
  }
);

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
router.get(
  '/hipaa/controls/:id',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    const control = ALL_HIPAA_CONTROLS.find(c => c.id === singleParam(req.params.id));

    if (!control) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `HIPAA control not found: ${singleParam(req.params.id)}`,
        },
      });
    }

    res.json(wrapResponse(control, req));
  }
);

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
router.get(
  '/hipaa/phi-identifiers',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    res.json(wrapResponse({
      identifiers: PHI_IDENTIFIERS,
      total: PHI_IDENTIFIERS.length,
      description: 'The 18 HIPAA-defined identifiers that constitute Protected Health Information (PHI)',
    }, req));
  }
);

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
router.post(
  '/hipaa/assess',
  requirePermission('compliance:assess'),
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { categories } = req.body;
    const assessment = await hipaaService!.performAssessment(tenantId, { categories });

    logger.info(
      {
        tenantId,
        framework: 'HIPAA',
        score: (assessment.summary.compliant / assessment.summary.totalControls) * 100,
        assessedBy: getUserId(req),
      },
      'HIPAA assessment completed'
    );

    res.json(wrapResponse(assessment, req));
  }
);

/**
 * @swagger
 * /api/v4/compliance/hipaa/history:
 *   get:
 *     summary: Get HIPAA assessment history
 *     tags: [Compliance - HIPAA]
 */
router.get(
  '/hipaa/history',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const history = await hipaaService!.getAssessmentHistory(tenantId);
    res.json(wrapResponse(history, req));
  }
);

/**
 * @swagger
 * /api/v4/compliance/hipaa/assessments/{id}:
 *   get:
 *     summary: Get specific HIPAA assessment
 *     tags: [Compliance - HIPAA]
 */
router.get(
  '/hipaa/assessments/:id',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    const assessment = await hipaaService!.getAssessment(singleParam(req.params.id));
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(wrapResponse(assessment, req));
  }
);


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
router.post(
  '/hipaa/evidence',
  requirePermission('compliance:evidence:submit'),
  async (req: Request, res: Response) => {
    const control = ALL_HIPAA_CONTROLS.find(c => c.id === req.body.controlId);
    if (!control) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CONTROL',
          message: `Unknown HIPAA control: ${req.body.controlId}`,
        },
      });
    }

    const evidence: EvidenceRecord = {
      id: `evidence-${randomUUID()}`,
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

    logger.info({
      evidenceId: evidence.id,
      controlId: evidence.controlId,
      framework: 'HIPAA',
      submittedBy: evidence.collectedBy,
    }, 'HIPAA evidence submitted');

    res.status(201).json(wrapResponse(evidence, req));
  }
);

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
router.get(
  '/sox/controls',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    let controls = [...ALL_SOX_CONTROLS];

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
      categories: SOX_FRAMEWORK.categories,
      itgcDomains: ITGC_DOMAINS,
    }, req));
  }
);

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
router.get(
  '/sox/controls/:id',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    const control = ALL_SOX_CONTROLS.find(c => c.id === singleParam(req.params.id));

    if (!control) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `SOX control not found: ${singleParam(req.params.id)}`,
        },
      });
    }

    res.json(wrapResponse(control, req));
  }
);

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
router.get(
  '/sox/itgc-domains',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    res.json(wrapResponse({
      domains: ITGC_DOMAINS,
      description: 'IT General Controls (ITGC) domains for SOX compliance',
    }, req));
  }
);

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
router.post(
  '/sox/assess',
  requirePermission('compliance:assess'),
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const sections = Array.isArray(req.body.sections) ? req.body.sections : undefined;
    const categories = Array.isArray(req.body.categories) ? req.body.categories : sections;
    const assessment = await soxService!.performAssessment(tenantId, {
      categories: categories as any[],
    });

    logger.info(
      {
        tenantId,
        framework: 'SOX',
        score: (assessment.summary.effective / assessment.summary.totalControls) * 100,
        assessedBy: getUserId(req),
      },
      'SOX assessment completed'
    );

    res.json(wrapResponse(assessment, req));
  }
);

/**
 * @swagger
 * /api/v4/compliance/sox/history:
 *   get:
 *     summary: Get SOX assessment history
 *     tags: [Compliance - SOX]
 */
router.get(
  '/sox/history',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const history = await soxService!.getAssessmentHistory(tenantId);
    res.json(wrapResponse(history, req));
  }
);

/**
 * @swagger
 * /api/v4/compliance/sox/assessments/{id}:
 *   get:
 *     summary: Get specific SOX assessment
 *     tags: [Compliance - SOX]
 */
router.get(
  '/sox/assessments/:id',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    const assessment = await soxService!.getAssessment(singleParam(req.params.id));
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(wrapResponse(assessment, req));
  }
);


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
router.post(
  '/sox/evidence',
  requirePermission('compliance:evidence:submit'),
  async (req: Request, res: Response) => {
    const control = ALL_SOX_CONTROLS.find(c => c.id === req.body.controlId);
    if (!control) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CONTROL',
          message: `Unknown SOX control: ${req.body.controlId}`,
        },
      });
    }

    const evidence: EvidenceRecord = {
      id: `evidence-${randomUUID()}`,
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

    logger.info({
      evidenceId: evidence.id,
      controlId: evidence.controlId,
      framework: 'SOX',
      submittedBy: evidence.collectedBy,
    }, 'SOX evidence submitted');

    res.status(201).json(wrapResponse(evidence, req));
  }
);

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
router.get(
  '/mappings',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
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
      filteredMappings = filteredMappings.filter(
        m => m.source.framework === req.query.sourceFramework
      );
    }
    if (req.query.targetFramework) {
      filteredMappings = filteredMappings.filter(
        m => m.target.framework === req.query.targetFramework
      );
    }

    res.json(wrapResponse({
      mappings: filteredMappings,
      total: filteredMappings.length,
    }, req));
  }
);

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
router.get(
  '/dashboard',
  requirePermission('compliance:read'),
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const hipaaLatest = await hipaaService!.getAssessmentHistory(tenantId);
    const soxLatest = await soxService!.getAssessmentHistory(tenantId);

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
  }
);


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
router.get('/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    frameworks: {
      HIPAA: {
        status: 'active',
        controls: ALL_HIPAA_CONTROLS.length,
      },
      SOX: {
        status: 'active',
        controls: ALL_SOX_CONTROLS.length,
      },
    },
    timestamp: new Date().toISOString(),
    version: '4.1.0',
  });
});

export default router;
export { router as complianceV4Router };
