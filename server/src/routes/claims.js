"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const ProvenanceClaimService_js_1 = require("../services/ProvenanceClaimService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const service = ProvenanceClaimService_js_1.ProvenanceClaimService.getInstance();
const createClaimSchema = zod_1.z.object({
    content: zod_1.z.string().min(1),
    subject: zod_1.z.string().optional(),
    predicate: zod_1.z.string().optional(),
    object: zod_1.z.string().optional(),
    effective_date: zod_1.z.string().transform((d) => new Date(d)).optional(),
    location: zod_1.z.record(zod_1.z.any()).optional(),
    extraction_method: zod_1.z.string().optional(),
    claim_type: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    evidence_ids: zod_1.z.array(zod_1.z.string()),
    source_id: zod_1.z.string(),
    transform_chain: zod_1.z.array(zod_1.z.string()).optional(),
    license_id: zod_1.z.string(),
    investigation_id: zod_1.z.string().optional(),
});
const linkEvidenceSchema = zod_1.z.object({
    evidence_id: zod_1.z.string(),
    relation_type: zod_1.z.enum(['SUPPORTS', 'CONTRADICTS']),
    confidence: zod_1.z.number().optional(),
    offset_start: zod_1.z.number().optional(),
    offset_end: zod_1.z.number().optional(),
    page_number: zod_1.z.number().optional(),
    bbox: zod_1.z.array(zod_1.z.number()).optional(),
    segment_text: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
// Create a new claim
router.post('/', auth_js_1.ensureAuthenticated, async (req, res, next) => {
    try {
        const validated = createClaimSchema.parse(req.body);
        const claim = await service.registerClaim({
            ...validated,
            created_by: req.user.id,
            tenant_id: req.user.tenantId,
        });
        res.status(201).json(claim);
    }
    catch (error) {
        next(error);
    }
});
// Link evidence to an existing claim
router.post('/:id/evidence', auth_js_1.ensureAuthenticated, async (req, res, next) => {
    try {
        const validated = linkEvidenceSchema.parse(req.body);
        const link = await service.linkClaimToEvidence({
            claim_id: req.params.id,
            ...validated,
            created_by: req.user.id,
            tenant_id: req.user.tenantId,
        });
        res.status(201).json(link);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
