import { Router } from 'express';
import { z } from 'zod';
import { ProvenanceClaimService } from '../services/ProvenanceClaimService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';

const router = Router();
const service = ProvenanceClaimService.getInstance();

const createClaimSchema = z.object({
  content: z.string().min(1),
  subject: z.string().optional(),
  predicate: z.string().optional(),
  object: z.string().optional(),
  effective_date: z.string().transform((d: string) => new Date(d)).optional(),
  location: z.record(z.any()).optional(),
  extraction_method: z.string().optional(),
  claim_type: z.string(),
  confidence: z.number().min(0).max(1),
  evidence_ids: z.array(z.string()),
  source_id: z.string(),
  transform_chain: z.array(z.string()).optional(),
  license_id: z.string(),
  investigation_id: z.string().optional(),
});

const linkEvidenceSchema = z.object({
  evidence_id: z.string(),
  relation_type: z.enum(['SUPPORTS', 'CONTRADICTS']),
  confidence: z.number().optional(),
  offset_start: z.number().optional(),
  offset_end: z.number().optional(),
  page_number: z.number().optional(),
  bbox: z.array(z.number()).optional(),
  segment_text: z.string().optional(),
  notes: z.string().optional(),
});

// Create a new claim
router.post('/', ensureAuthenticated, async (req: any, res: any, next: any) => {
  try {
    const validated = createClaimSchema.parse(req.body);
    const claim = await service.registerClaim({
      ...validated,
      created_by: req.user!.id,
      tenant_id: req.user!.tenantId,
    });
    res.status(201).json(claim);
  } catch (error: any) {
    next(error);
  }
});

// Link evidence to an existing claim
router.post('/:id/evidence', ensureAuthenticated, async (req: any, res: any, next: any) => {
  try {
    const validated = linkEvidenceSchema.parse(req.body);
    const link = await service.linkClaimToEvidence({
      claim_id: req.params.id,
      ...validated,
      created_by: req.user!.id,
      tenant_id: req.user!.tenantId,
    });
    res.status(201).json(link);
  } catch (error: any) {
    next(error);
  }
});

export default router;
