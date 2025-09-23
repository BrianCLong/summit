/**
 * IntelGraph GA-Core Provenance Ledger Routes
 * Committee Requirements: Export manifests, disclosure bundles, audit trails
 */

import express from 'express';
import { requireAuthority, requireReasonForAccess } from '../middleware/authority.js';
import ProvenanceLedgerService from '../services/provenance-ledger.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const provenanceService = ProvenanceLedgerService.getInstance();

// Committee requirement: All provenance operations require reason for access
router.use(requireReasonForAccess);

// Register claim with provenance tracking
router.post('/claims', 
  requireAuthority('claim_registration', ['investigation', 'evidence']),
  async (req, res) => {
    try {
      const { content, confidence, evidence_hashes, investigation_id } = req.body;
      const user = req.user as any;

      const claim = await provenanceService.registerClaim({
        content,
        confidence: confidence || 1.0,
        evidence_hashes: evidence_hashes || [],
        created_by: user.id,
        investigation_id
      });

      res.status(201).json({
        success: true,
        claim,
        message: 'Claim registered with provenance tracking'
      });
    } catch (error) {
      logger.error({
        message: 'Claim registration failed',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Claim registration failed',
        code: 'CLAIM_REGISTRATION_ERROR'
      });
    }
  }
);

// Starkey dissent: Create export manifest (required for exports)
router.post('/manifests',
  requireAuthority('export_data', ['manifest', 'authority_basis']),
  async (req, res) => {
    try {
      const {
        export_type,
        data_sources,
        transformation_chain,
        authority_basis,
        classification_level,
        retention_policy
      } = req.body;
      const user = req.user as any;

      // Validate authority basis (Starkey dissent requirement)
      if (!authority_basis || authority_basis.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Authority basis required for export manifest - Starkey dissent protection',
          code: 'MISSING_AUTHORITY_BASIS'
        });
      }

      const manifest = await provenanceService.createExportManifest({
        export_type,
        data_sources: data_sources || [],
        transformation_chain: transformation_chain || [],
        authority_basis,
        classification_level: classification_level || 'UNCLASSIFIED',
        retention_policy: retention_policy || 'STANDARD',
        chain_of_custody: [{
          actor_id: user.id,
          action: 'MANIFEST_CREATED',
          timestamp: new Date(),
          signature: 'auto-generated',
          justification: req.reason_for_access?.reason || 'Export manifest creation'
        }]
      });

      res.status(201).json({
        success: true,
        manifest,
        message: 'Export manifest created with authority basis validation'
      });
    } catch (error) {
      logger.error({
        message: 'Export manifest creation failed',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Export manifest creation failed',
        code: 'MANIFEST_CREATION_ERROR'
      });
    }
  }
);

// Starkey dissent: Create immutable disclosure bundle
router.post('/bundles',
  requireAuthority('export_data', ['bundle', 'immutable_seal']),
  async (req, res) => {
    try {
      const {
        claim_ids,
        evidence_references,
        export_type,
        authority_basis,
        classification_level
      } = req.body;
      const user = req.user as any;

      // Validate required fields (Committee requirements)
      if (!claim_ids || claim_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Claims required for disclosure bundle',
          code: 'MISSING_CLAIMS'
        });
      }

      if (!authority_basis || authority_basis.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Authority basis required - Starkey dissent protection',
          code: 'MISSING_AUTHORITY_BASIS'
        });
      }

      // Retrieve claims (simplified - would query actual claim records)
      const claims = claim_ids.map((id: string) => ({
        id,
        content_hash: `hash-${id}`,
        content: `Claim content for ${id}`,
        confidence: 1.0,
        evidence_hashes: [],
        created_at: new Date(),
        created_by: user.id
      }));

      const bundle = await provenanceService.createDisclosureBundle({
        claims,
        evidence_references: evidence_references || [],
        export_type: export_type || 'INVESTIGATION_EXPORT',
        actor_id: user.id,
        authority_basis,
        classification_level: classification_level || 'UNCLASSIFIED'
      });

      logger.info({
        message: 'Immutable disclosure bundle created - Starkey dissent compliance',
        bundle_id: bundle.bundle_id,
        user_id: user.id,
        claim_count: claims.length
      });

      res.status(201).json({
        success: true,
        bundle: {
          bundle_id: bundle.bundle_id,
          bundle_hash: bundle.bundle_hash,
          immutable_seal: bundle.immutable_seal,
          export_manifest: bundle.export_manifest,
          created_at: bundle.created_at
        },
        message: 'Immutable disclosure bundle created with cryptographic seal'
      });
    } catch (error) {
      logger.error({
        message: 'Disclosure bundle creation failed',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Disclosure bundle creation failed',
        code: 'BUNDLE_CREATION_ERROR'
      });
    }
  }
);

// Committee requirement: Provenance chain verification
router.post('/verify',
  requireAuthority('audit_verification', ['provenance']),
  async (req, res) => {
    try {
      const { entity_ids } = req.body;

      if (!entity_ids || !Array.isArray(entity_ids)) {
        return res.status(400).json({
          success: false,
          error: 'Entity IDs array required for verification',
          code: 'MISSING_ENTITY_IDS'
        });
      }

      const verification = await provenanceService.verifyProvenanceChain(entity_ids);

      if (!verification.valid) {
        logger.warn({
          message: 'Provenance chain verification failed',
          errors: verification.errors,
          entity_count: entity_ids.length,
          user_id: req.user?.id
        });
      }

      res.json({
        success: true,
        verification,
        entity_count: entity_ids.length,
        message: verification.valid ? 'Provenance chain valid' : 'Provenance chain integrity issues detected'
      });
    } catch (error) {
      logger.error({
        message: 'Provenance verification failed',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Provenance verification failed',
        code: 'VERIFICATION_ERROR'
      });
    }
  }
);

// Committee requirement: Audit trail queries
router.get('/audit',
  requireAuthority('audit_access', ['trail']),
  async (req, res) => {
    try {
      const {
        actor_id,
        operation_type,
        start_date,
        end_date,
        limit = 100
      } = req.query;

      const filters: any = {};

      if (actor_id) filters.actor_id = actor_id as string;
      if (operation_type) filters.operation_type = operation_type as string;
      if (start_date && end_date) {
        filters.time_range = {
          start: new Date(start_date as string),
          end: new Date(end_date as string)
        };
      }

      const auditTrail = await provenanceService.getAuditTrail(filters);

      res.json({
        success: true,
        audit_trail: auditTrail.slice(0, parseInt(limit as string)),
        total_entries: auditTrail.length,
        filters_applied: filters
      });
    } catch (error) {
      logger.error({
        message: 'Audit trail query failed',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Audit trail query failed',
        code: 'AUDIT_QUERY_ERROR'
      });
    }
  }
);

// Health check for provenance services
router.get('/health', async (req, res) => {
  try {
    // Basic health check - would expand for production
    res.json({
      success: true,
      service: 'provenance-ledger',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: {
        claim_registration: true,
        export_manifests: true,
        immutable_bundles: true,
        chain_verification: true,
        audit_trails: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'provenance-ledger',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;