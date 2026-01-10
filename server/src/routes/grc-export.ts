import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  grcExportService,
  GRCExportRequest,
  ComplianceFramework
} from '../integrations/grc/grc-export.service.js';
import { tenantHeader } from '../middleware/tenantHeader.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import logger from '../utils/logger.js';

const router = Router();

// Apply middleware
router.use(tenantHeader());
router.use(ensureAuthenticated);

/**
 * Export control mappings
 * GET /api/v1/grc/export/control-mappings
 */
const controlMappingsQuerySchema = z.object({
  framework: z.enum([
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
  mode: z.enum(['snapshot', 'delta']).default('snapshot'),
  sinceDate: z.string().datetime().optional()
});

router.get(
  '/control-mappings',
  requirePermission('grc:export:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;

      // Validate query parameters
      const params = controlMappingsQuerySchema.parse(req.query);

      const request: GRCExportRequest = {
        tenantId,
        framework: params.framework as ComplianceFramework | undefined,
        mode: params.mode,
        sinceDate: params.sinceDate ? new Date(params.sinceDate) : undefined
      };

      const result = await grcExportService.exportControlMappings(request);

      // Audit log the export
      logger.info('GRC control mappings exported', {
        tenantId,
        framework: params.framework,
        mode: params.mode,
        controlCount: result.controlMappings.length,
        requestId: (req as any).requestId
      });

      res.json(result);
    } catch (error: any) {
      logger.error('GRC control mappings export failed', {
        error: error.message,
        requestId: (req as any).requestId
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Invalid query parameters',
            details: error.errors,
            requestId: (req as any).requestId
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export control mappings',
          requestId: (req as any).requestId
        }
      });
    }
  }
);

/**
 * Generate evidence package
 * POST /api/v1/grc/export/evidence-package
 */
const evidencePackageSchema = z.object({
  packageType: z.enum(['soc2_type_ii', 'gdpr_ropa', 'hipaa_audit', 'custom']),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime()
});

router.post(
  '/evidence-package',
  requirePermission('grc:export:write'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const userId = (req as any).user?.id || 'system';

      // Validate request body
      const params = evidencePackageSchema.parse(req.body);

      const evidencePackage = await grcExportService.generateEvidencePackage(
        tenantId,
        params.packageType,
        new Date(params.periodStart),
        new Date(params.periodEnd),
        userId
      );

      // Audit log the package generation
      logger.info('GRC evidence package generated', {
        tenantId,
        packageId: evidencePackage.packageId,
        packageType: params.packageType,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        artifactCount: evidencePackage.contents.evidenceArtifacts,
        requestId: (req as any).requestId
      });

      res.status(201).json(evidencePackage);
    } catch (error: any) {
      logger.error('GRC evidence package generation failed', {
        error: error.message,
        requestId: (req as any).requestId
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Invalid request body',
            details: error.errors,
            requestId: (req as any).requestId
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'PACKAGE_GENERATION_FAILED',
          message: 'Failed to generate evidence package',
          requestId: (req as any).requestId
        }
      });
    }
  }
);

/**
 * Export verification results
 * GET /api/v1/grc/export/verification-results
 */
const verificationResultsQuerySchema = z.object({
  controlId: z.string().uuid().optional()
});

router.get(
  '/verification-results',
  requirePermission('grc:export:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;

      // Validate query parameters
      const params = verificationResultsQuerySchema.parse(req.query);

      const results = await grcExportService.exportVerificationResults(
        tenantId,
        params.controlId
      );

      // Audit log the export
      logger.info('GRC verification results exported', {
        tenantId,
        controlId: params.controlId,
        resultCount: results.length,
        requestId: (req as any).requestId
      });

      res.json({
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        tenantId,
        controlId: params.controlId,
        results
      });
    } catch (error: any) {
      logger.error('GRC verification results export failed', {
        error: error.message,
        requestId: (req as any).requestId
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Invalid query parameters',
            details: error.errors,
            requestId: (req as any).requestId
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export verification results',
          requestId: (req as any).requestId
        }
      });
    }
  }
);

/**
 * Health check endpoint
 * GET /api/v1/grc/export/health
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'grc-export',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;
