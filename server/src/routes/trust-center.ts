import express from 'express';
import { z } from 'zod';
import { TrustCenterService } from '../trust-center/trust-center-service.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { ensureAuthenticated, requirePermission } from '../middleware/auth.js';
import { Permission } from '../services/MVP1RBACService.js';
import { writeAudit } from '../utils/audit.js';

const router = express.Router();
const trustCenter = new TrustCenterService();

// Validation schemas
const AuditExportSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['json', 'csv', 'pdf']).optional(),
  includeMetrics: z.boolean().optional(),
  includeCompliance: z.boolean().optional(),
  frameworks: z.array(z.enum(['SOC2', 'ISO27001', 'HIPAA', 'PCI'])).optional(),
});

const SLSARequestSchema = z.object({
  buildDefinition: z.object({
    buildType: z.string(),
    externalParameters: z.record(z.any()),
    internalParameters: z.record(z.any()).optional(),
  }),
  runDetails: z.object({
    builder: z.object({
      id: z.string(),
      version: z.string().optional(),
    }),
    metadata: z.object({
      invocationId: z.string(),
      startedOn: z.string(),
      finishedOn: z.string().optional(),
    }),
  }),
});

const ComplianceCheckSchema = z.object({
  framework: z.enum(['SOC2', 'ISO27001', 'HIPAA', 'PCI']),
});

/**
 * POST /api/trust-center/audit-export
 * Generate comprehensive audit report with one-click export
 */
router.post(
  '/audit-export',
  ensureAuthenticated,
  requirePermission(Permission.AUDIT_EXPORT),
  async (req, res) => {
    const span = otelService.createSpan('trust-center.audit-export');

    try {
      const actor = (req as any).user;
      // Extract tenant from auth context (assuming middleware sets this)
      const tenantId =
        actor?.tenantId || (req.headers['x-tenant-id'] as string) || 'default';

      const validatedData = AuditExportSchema.parse(req.body);

      if (actor?.tenantId && actor.tenantId !== tenantId) {
        return res.status(403).json({ error: 'tenant_mismatch' });
      }

      const result = await trustCenter.generateComprehensiveAuditReport(
        tenantId,
        validatedData,
        {
          id: actor?.id,
          email: actor?.email,
          permissions: actor?.permissions,
          role: actor?.role,
          tenantId,
        },
      );

      // Set appropriate headers based on format
      if (validatedData.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${result.filename}"`,
        );
        res.send(result.data);
      } else if (validatedData.format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${result.filename}"`,
        );
        res.send(result.data);
      } else {
        res.json(result);
      }

      await writeAudit({
        userId: actor?.id,
        action: 'trust-center:audit-export',
        resourceType: 'trust_center_report',
        resourceId: result?.metadata?.reportId || 'comprehensive_audit',
        details: {
          tenantId,
          format: validatedData.format || 'json',
          frameworks: validatedData.frameworks || ['SOC2', 'ISO27001'],
          startDate: validatedData.startDate || '1970-01-01',
          endDate:
            validatedData.endDate || new Date().toISOString().split('T')[0],
        },
        actorRole: actor?.role,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      otelService.addSpanAttributes({
        'trust-center.tenant_id': tenantId,
        'trust-center.format': validatedData.format || 'json',
        'trust-center.frameworks':
          validatedData.frameworks?.join(',') || 'SOC2,ISO27001',
      });
    } catch (error: any) {
      console.error('Audit export failed:', error);
      otelService.recordException(error);

      if (error.name === 'ZodError') {
        res
          .status(400)
          .json({ error: 'Invalid request data', details: error.errors });
      } else {
        res
          .status(500)
          .json({ error: 'Audit export failed', message: error.message });
      }
    } finally {
      span?.end();
    }
  },
);

/**
 * POST /api/trust-center/slsa-attestation
 * Generate SLSA attestation for supply chain security
 */
router.post('/slsa-attestation', async (req, res) => {
  const span = otelService.createSpan('trust-center.slsa-attestation');

  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const validatedData = SLSARequestSchema.parse(req.body);

    const attestation = await trustCenter.generateSLSAAttestation(
      tenantId,
      validatedData,
    );

    res.json({
      attestation,
      verification: {
        downloadUrl: `/api/trust-center/verify-attestation/${attestation.statement?.subject?.[0]?.digest?.sha256}`,
        instructions:
          'Use slsa-verifier or verify independently with the signature',
      },
    });

    otelService.addSpanAttributes({
      'trust-center.tenant_id': tenantId,
      'trust-center.build_type': validatedData.buildDefinition.buildType,
      'trust-center.builder_id': validatedData.runDetails.builder.id,
    });
  } catch (error: any) {
    console.error('SLSA attestation failed:', error);
    otelService.recordException(error);

    if (error.name === 'ZodError') {
      res
        .status(400)
        .json({ error: 'Invalid request data', details: error.errors });
    } else {
      res
        .status(500)
        .json({ error: 'SLSA attestation failed', message: error.message });
    }
  } finally {
    span?.end();
  }
});

/**
 * POST /api/trust-center/sbom
 * Generate Software Bill of Materials (SBOM) report
 */
router.post('/sbom', async (req, res) => {
  const span = otelService.createSpan('trust-center.sbom');

  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const runId = req.body.runId || `run-${Date.now()}`;

    const sbom = await trustCenter.generateSBOM(tenantId, runId);

    res.json({
      sbom,
      downloadUrl: `/api/trust-center/sbom/${tenantId}/${runId}`,
      format: 'CycloneDX',
      version: '1.4',
    });

    otelService.addSpanAttributes({
      'trust-center.tenant_id': tenantId,
      'trust-center.run_id': runId,
      'trust-center.components_count': sbom.components?.length || 0,
    });
  } catch (error: any) {
    console.error('SBOM generation failed:', error);
    otelService.recordException(error);
    res
      .status(500)
      .json({ error: 'SBOM generation failed', message: error.message });
  } finally {
    span?.end();
  }
});

/**
 * GET /api/trust-center/compliance/:framework
 * Check compliance status for specific framework
 */
router.get('/compliance/:framework', async (req, res) => {
  const span = otelService.createSpan('trust-center.compliance-check');

  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const { framework } = req.params;

    const validatedFramework = ComplianceCheckSchema.parse({
      framework,
    }).framework;

    const complianceStatus = await trustCenter.checkComplianceStatus(
      tenantId,
      validatedFramework,
    );

    res.json(complianceStatus);

    otelService.addSpanAttributes({
      'trust-center.tenant_id': tenantId,
      'trust-center.framework': framework,
      'trust-center.compliance_status': complianceStatus.overallStatus,
    });
  } catch (error: any) {
    console.error('Compliance check failed:', error);
    otelService.recordException(error);

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Invalid framework',
        supported: ['SOC2', 'ISO27001', 'HIPAA', 'PCI'],
      });
    } else {
      res
        .status(500)
        .json({ error: 'Compliance check failed', message: error.message });
    }
  } finally {
    span?.end();
  }
});

/**
 * GET /api/trust-center/compliance
 * Get comprehensive compliance dashboard
 */
router.get('/compliance', async (req, res) => {
  const span = otelService.createSpan('trust-center.compliance-dashboard');

  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const frameworks = ['SOC2', 'ISO27001', 'HIPAA', 'PCI'] as const;

    const complianceResults = await Promise.all(
      frameworks.map((framework) =>
        trustCenter.checkComplianceStatus(tenantId, framework),
      ),
    );

    const dashboard = {
      tenant: tenantId,
      lastUpdated: new Date().toISOString(),
      overallScore:
        (complianceResults.filter((r) => r.overallStatus === 'compliant')
          .length /
          complianceResults.length) *
        100,
      frameworks: complianceResults.reduce((acc, result) => {
        acc[result.framework] = {
          status: result.overallStatus,
          lastAssessment: result.lastAssessment,
          controlsTotal: result.controls?.length || 0,
          controlsCompliant:
            result.controls?.filter((c: any) => c.status === 'compliant')
              .length || 0,
          recommendations: result.recommendations || [],
        };
        return acc;
      }, {} as any),
    };

    res.json(dashboard);

    otelService.addSpanAttributes({
      'trust-center.tenant_id': tenantId,
      'trust-center.overall_score': dashboard.overallScore,
      'trust-center.frameworks_count': complianceResults.length,
    });
  } catch (error: any) {
    console.error('Compliance dashboard failed:', error);
    otelService.recordException(error);
    res
      .status(500)
      .json({ error: 'Compliance dashboard failed', message: error.message });
  } finally {
    span?.end();
  }
});

/**
 * GET /api/trust-center/verify-attestation/:hash
 * Independently verify SLSA attestation by hash
 */
router.get('/verify-attestation/:hash', async (req, res) => {
  const span = otelService.createSpan('trust-center.verify-attestation');

  try {
    const { hash } = req.params;

    // In production, look up attestation by hash and return verification data
    res.json({
      verification: 'independent',
      hash,
      instructions: [
        'Download the attestation JSON',
        'Use slsa-verifier: slsa-verifier verify-artifact <binary> --provenance <attestation>',
        'Or verify signature manually with public key',
      ],
      publicKey: 'https://trust.intelgraph.dev/keys/signing.pem',
      format: 'SLSA v1.0',
    });

    otelService.addSpanAttributes({
      'trust-center.verification_hash': hash,
    });
  } catch (error: any) {
    console.error('Attestation verification failed:', error);
    otelService.recordException(error);
    res
      .status(500)
      .json({ error: 'Verification failed', message: error.message });
  } finally {
    span?.end();
  }
});

/**
 * GET /api/trust-center/health
 * Trust Center health and status
 */
router.get('/health', async (req, res) => {
  const span = otelService.createSpan('trust-center.health');

  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        auditExport: 'operational',
        slsaAttestation: 'operational',
        sbomGeneration: 'operational',
        complianceCheck: 'operational',
      },
      version: '1.0.0',
      supportedFrameworks: ['SOC2', 'ISO27001', 'HIPAA', 'PCI'],
      supportedFormats: ['json', 'csv', 'pdf'],
    };

    res.json(health);
  } catch (error: any) {
    console.error('Trust Center health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    span?.end();
  }
});

export { router as trustCenterRouter };
