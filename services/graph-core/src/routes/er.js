"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const schema_js_1 = require("../schema.js");
const er_js_1 = require("../services/er.js");
const CandidateInput = zod_1.z.object({
    entities: zod_1.z.array(schema_js_1.EntitySchema),
});
const DecideInput = zod_1.z.object({
    candidateId: zod_1.z.string(),
    approved: zod_1.z.boolean(),
    user: zod_1.z.string(),
});
const router = (0, express_1.Router)();
router.post('/candidates', (req, res) => {
    const parsed = CandidateInput.safeParse(req.body);
    if (!parsed.success || parsed.data.entities.length !== 2) {
        return res.status(400).json({ error: 'two entities required' });
    }
    const [a, b] = parsed.data.entities;
    const score = (0, er_js_1.scoreEntities)(a, b);
    (0, er_js_1.enqueueCandidate)(score);
    res.json(score);
});
router.get('/candidates', (_req, res) => {
    res.json((0, er_js_1.listCandidates)());
});
router.post('/decide', (req, res) => {
    const parsed = DecideInput.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    (0, er_js_1.decide)(parsed.data.candidateId, parsed.data.approved, parsed.data.user);
    res.json({ status: 'ok' });
});
router.get('/explanations/:id', (req, res) => {
    const explanation = (0, er_js_1.getExplanation)(req.params.id);
    if (!explanation)
        return res.status(404).json({ error: 'not found' });
    res.json(explanation);
});
exports.default = router;
