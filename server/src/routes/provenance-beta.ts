/**
 * Provenance Ledger Beta API Routes
 * REST API for source tracking, transforms, evidence, claims, and export manifests
 */

import { Router, Request, Response } from 'express';
import { ProvenanceLedgerBetaService } from '../services/provenance-ledger-beta.js';
import { ingestDocument } from '../services/evidence-registration-flow.js';
import logger from '../utils/logger.js';
import type {
  SourceInput,
  TransformInput,
  EvidenceInput,
  ClaimInput,
  ClaimEvidenceLinkInput,
  LicenseInput,
  BundleCreateInput,
  ClaimQueryFilters,
} from '../types/provenance-beta.js';

const router = Router();
const provenanceLedger = ProvenanceLedgerBetaService.getInstance();

// ============================================================================
// LICENSE ENDPOINTS
// ============================================================================

/**
 * POST /api/provenance-beta/licenses
 * Create a new license
 */
router.post('/licenses', async (req: Request, res: Response) => {
  try {
    const input: LicenseInput = req.body;
    const license = await provenanceLedger.createLicense(input);

    res.status(201).json({
      success: true,
      data: license,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to create license',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'License creation failed',
    });
  }
});

/**
 * GET /api/provenance-beta/licenses/:id
 * Get a license by ID
 */
router.get('/licenses/:id', async (req: Request, res: Response) => {
  try {
    const license = await provenanceLedger.getLicense(req.params.id);

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
      });
    }

    res.json({
      success: true,
      data: license,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get license',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get license',
    });
  }
});

// ============================================================================
// SOURCE ENDPOINTS
// ============================================================================

/**
 * POST /api/provenance-beta/sources
 * Register a new source
 */
router.post('/sources', async (req: Request, res: Response) => {
  try {
    const input: SourceInput = req.body;
    const source = await provenanceLedger.registerSource(input);

    res.status(201).json({
      success: true,
      data: source,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to register source',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Source registration failed',
    });
  }
});

/**
 * GET /api/provenance-beta/sources/:id
 * Get a source by ID
 */
router.get('/sources/:id', async (req: Request, res: Response) => {
  try {
    const source = await provenanceLedger.getSource(req.params.id);

    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Source not found',
      });
    }

    res.json({
      success: true,
      data: source,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get source',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get source',
    });
  }
});

// ============================================================================
// TRANSFORM ENDPOINTS
// ============================================================================

/**
 * POST /api/provenance-beta/transforms
 * Register a new transform
 */
router.post('/transforms', async (req: Request, res: Response) => {
  try {
    const input: TransformInput = req.body;
    const transform = await provenanceLedger.registerTransform(input);

    res.status(201).json({
      success: true,
      data: transform,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to register transform',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Transform registration failed',
    });
  }
});

/**
 * GET /api/provenance-beta/transforms/:id
 * Get a transform by ID
 */
router.get('/transforms/:id', async (req: Request, res: Response) => {
  try {
    const transform = await provenanceLedger.getTransform(req.params.id);

    if (!transform) {
      return res.status(404).json({
        success: false,
        error: 'Transform not found',
      });
    }

    res.json({
      success: true,
      data: transform,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get transform',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transform',
    });
  }
});

// ============================================================================
// EVIDENCE ENDPOINTS
// ============================================================================

/**
 * POST /api/provenance-beta/evidence
 * Register new evidence
 */
router.post('/evidence', async (req: Request, res: Response) => {
  try {
    const input: EvidenceInput = req.body;
    const evidence = await provenanceLedger.registerEvidence(input);

    res.status(201).json({
      success: true,
      data: evidence,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to register evidence',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Evidence registration failed',
    });
  }
});

/**
 * GET /api/provenance-beta/evidence/:id
 * Get evidence by ID
 */
router.get('/evidence/:id', async (req: Request, res: Response) => {
  try {
    const evidence = await provenanceLedger.getEvidence(req.params.id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        error: 'Evidence not found',
      });
    }

    res.json({
      success: true,
      data: evidence,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get evidence',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get evidence',
    });
  }
});

// ============================================================================
// CLAIM ENDPOINTS
// ============================================================================

/**
 * POST /api/provenance-beta/claims
 * Register a new claim
 */
router.post('/claims', async (req: Request, res: Response) => {
  try {
    const input: ClaimInput = req.body;
    const claim = await provenanceLedger.registerClaim(input);

    res.status(201).json({
      success: true,
      data: claim,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to register claim',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Claim registration failed',
    });
  }
});

/**
 * GET /api/provenance-beta/claims/:id
 * Get a claim by ID with full provenance
 */
router.get('/claims/:id', async (req: Request, res: Response) => {
  try {
    const claim = await provenanceLedger.getClaim(req.params.id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found',
      });
    }

    // Optionally include full provenance chain
    if (req.query.include_provenance === 'true') {
      const provenance = await provenanceLedger.getProvenanceChain(
        req.params.id,
      );

      return res.json({
        success: true,
        data: {
          ...claim,
          provenance,
        },
      });
    }

    res.json({
      success: true,
      data: claim,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get claim',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get claim',
    });
  }
});

/**
 * GET /api/provenance-beta/claims
 * Query claims with filters
 */
router.get('/claims', async (req: Request, res: Response) => {
  try {
    const filters: ClaimQueryFilters = {
      investigation_id: req.query.investigation_id as string,
      created_by: req.query.created_by as string,
      claim_type: req.query.claim_type as any,
      confidence_min: req.query.confidence_min
        ? parseFloat(req.query.confidence_min as string)
        : undefined,
      confidence_max: req.query.confidence_max
        ? parseFloat(req.query.confidence_max as string)
        : undefined,
      source_id: req.query.source_id as string,
    };

    const claims = await provenanceLedger.queryClaims(filters);

    res.json({
      success: true,
      data: claims,
      count: claims.length,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to query claims',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query claims',
    });
  }
});

/**
 * POST /api/provenance-beta/claims/:claimId/evidence
 * Link evidence to a claim
 */
router.post(
  '/claims/:claimId/evidence',
  async (req: Request, res: Response) => {
    try {
      const input: ClaimEvidenceLinkInput = {
        claim_id: req.params.claimId,
        ...req.body,
      };

      const link = await provenanceLedger.linkClaimToEvidence(input);

      res.status(201).json({
        success: true,
        data: link,
      });
    } catch (error) {
      logger.error({
        message: 'Failed to link claim to evidence',
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to link claim to evidence',
      });
    }
  },
);

/**
 * GET /api/provenance-beta/claims/:claimId/evidence
 * Get all evidence linked to a claim
 */
router.get(
  '/claims/:claimId/evidence',
  async (req: Request, res: Response) => {
    try {
      const links = await provenanceLedger.getClaimEvidenceLinks(
        req.params.claimId,
      );

      res.json({
        success: true,
        data: links,
        count: links.length,
      });
    } catch (error) {
      logger.error({
        message: 'Failed to get claim evidence links',
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get claim evidence links',
      });
    }
  },
);

/**
 * GET /api/provenance-beta/evidence/:evidenceId/claims
 * Get all claims linked to evidence
 */
router.get(
  '/evidence/:evidenceId/claims',
  async (req: Request, res: Response) => {
    try {
      const links = await provenanceLedger.getEvidenceClaimLinks(
        req.params.evidenceId,
      );

      res.json({
        success: true,
        data: links,
        count: links.length,
      });
    } catch (error) {
      logger.error({
        message: 'Failed to get evidence claim links',
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get evidence claim links',
      });
    }
  },
);

// ============================================================================
// PROVENANCE CHAIN ENDPOINTS
// ============================================================================

/**
 * GET /api/provenance-beta/chain/:itemId
 * Get complete provenance chain for an item
 */
router.get('/chain/:itemId', async (req: Request, res: Response) => {
  try {
    const chain = await provenanceLedger.getProvenanceChain(req.params.itemId);

    res.json({
      success: true,
      data: chain,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get provenance chain',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get provenance chain',
    });
  }
});

// ============================================================================
// EXPORT MANIFEST ENDPOINTS
// ============================================================================

/**
 * POST /api/provenance-beta/export
 * Create an export manifest
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const input: BundleCreateInput = req.body;
    const manifest = await provenanceLedger.createExportManifest(input);

    res.status(201).json({
      success: true,
      data: manifest,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to create export manifest',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Export manifest creation failed',
    });
  }
});

/**
 * GET /api/provenance-beta/export/:manifestId/verify
 * Verify an export manifest
 */
router.get(
  '/export/:manifestId/verify',
  async (req: Request, res: Response) => {
    try {
      const report = await provenanceLedger.verifyManifest(
        req.params.manifestId,
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error({
        message: 'Failed to verify manifest',
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  },
);

// ============================================================================
// DOCUMENT INGESTION ENDPOINT
// ============================================================================

/**
 * POST /api/provenance-beta/ingest
 * Complete document ingestion flow
 */
router.post('/ingest', async (req: Request, res: Response) => {
  try {
    const {
      documentPath,
      documentContent,
      userId,
      investigationId,
      licenseId,
      metadata,
    } = req.body;

    if (!documentContent || !userId || !licenseId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: documentContent, userId, licenseId',
      });
    }

    const result = await ingestDocument({
      documentPath: documentPath || 'inline-document',
      documentContent,
      userId,
      investigationId,
      licenseId,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to ingest document',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Document ingestion failed',
    });
  }
});

// ============================================================================
// AUDIT CHAIN VERIFICATION ENDPOINT
// ============================================================================

/**
 * POST /api/provenance-beta/audit/verify
 * Verify the integrity of the audit chain
 */
router.post('/audit/verify', async (req: Request, res: Response) => {
  try {
    const options = {
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      limit: req.body.limit ? parseInt(req.body.limit) : undefined,
    };

    const result = await provenanceLedger.verifyAuditChain(options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to verify audit chain',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Audit chain verification failed',
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/provenance-beta/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'provenance-ledger-beta',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
