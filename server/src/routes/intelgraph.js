"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelGraphRouter = void 0;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const IntelGraphService_js_1 = require("../services/IntelGraphService.js");
const abac_js_1 = require("../middleware/abac.js");
const middleware_js_1 = require("../auth/webauthn/middleware.js");
const zod_1 = require("zod");
const router = express_1.default.Router();
const decisionSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    outcome: zod_1.z.string(),
    rationale: zod_1.z.string(),
    confidenceScore: zod_1.z.number().min(0).max(1),
    actorId: zod_1.z.string(),
    classification: zod_1.z.string().optional(),
    claimIds: zod_1.z.array(zod_1.z.string()).default([]),
    evidenceIds: zod_1.z.array(zod_1.z.string()).default([])
});
const claimSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    text: zod_1.z.string(),
    type: zod_1.z.string(),
    source: zod_1.z.string().optional(),
    classification: zod_1.z.string().optional()
});
router.post('/decisions', (0, abac_js_1.ensurePolicy)('create', 'decision'), middleware_js_1.requireStepUp, async (req, res) => {
    try {
        const body = decisionSchema.parse(req.body);
        const { claimIds, evidenceIds, ...decisionData } = body;
        const receipt = await IntelGraphService_js_1.intelGraphService.createDecision(decisionData, claimIds, evidenceIds);
        res.status(201).json({ receipt });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error creating decision:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/claims', (0, abac_js_1.ensurePolicy)('create', 'claim'), async (req, res) => {
    try {
        const body = claimSchema.parse(req.body);
        const claimId = await IntelGraphService_js_1.intelGraphService.createClaim(body);
        res.status(201).json({ claimId });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error creating claim:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/decisions/:id', async (req, res) => {
    try {
        const result = await IntelGraphService_js_1.intelGraphService.getDecisionWithReceipt(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Decision not found' });
        }
        res.json(result);
    }
    catch (error) {
        console.error('Error getting decision:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.intelGraphRouter = router;
