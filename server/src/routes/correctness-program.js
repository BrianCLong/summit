"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_js_1 = require("../correctness-program/index.js");
const observability_js_1 = require("../correctness-program/observability.js");
const router = (0, express_1.Router)();
router.use(observability_js_1.correlationIdMiddleware);
router.get('/truth-map', (_req, res) => {
    res.json({ truthMap: index_js_1.correctnessProgram.truthMap.listTruthMap(), debt: index_js_1.correctnessProgram.truthMap.listTruthDebt() });
});
router.post('/truth-debt', (req, res) => {
    const { domain, kind, description, mitigation, owner } = req.body;
    const record = index_js_1.correctnessProgram.truthMap.addTruthDebt(domain, kind, description, mitigation, owner);
    res.status(201).json(record);
});
router.post('/truth-check', (req, res) => {
    const { domain, entityId, sources } = req.body;
    const result = index_js_1.correctnessProgram.truthMap.truthCheck(domain, entityId, sources || []);
    res.json(result);
});
router.get('/invariants/violations', (req, res) => {
    const domain = req.query.domain;
    const violations = domain
        ? index_js_1.correctnessProgram.invariants.violationsByDomain(domain)
        : index_js_1.correctnessProgram.invariants.violationsByDomain('customer');
    res.json({ violations });
});
router.post('/reconciliation/run', async (req, res, next) => {
    try {
        const { pairId } = req.body;
        const run = await index_js_1.correctnessProgram.reconciliation.runPair(pairId);
        res.json(run);
    }
    catch (error) {
        next(error);
    }
});
router.get('/reconciliation/metrics', (_req, res) => {
    res.json(index_js_1.correctnessProgram.reconciliation.metrics());
});
router.post('/migrations/start', (req, res) => {
    const { domain, scope, total } = req.body;
    const manifest = index_js_1.correctnessProgram.buildMigrationManifest(domain, scope);
    const progress = index_js_1.correctnessProgram.startMigration(manifest, total);
    res.status(201).json({ manifest, progress });
});
router.post('/migrations/advance', (req, res) => {
    const { manifestId, batch } = req.body;
    const manifest = { id: manifestId };
    const progress = index_js_1.correctnessProgram.migrations.advance(manifest, batch || []);
    res.json(progress);
});
router.post('/events/validate', (req, res) => {
    const { envelope } = req.body;
    const result = index_js_1.correctnessProgram.eventContracts.validateEnvelope(envelope);
    res.json(result);
});
router.get('/governance/scorecards', (_req, res) => {
    res.json({ scorecards: index_js_1.correctnessProgram.governance.getScorecards(), waivers: index_js_1.correctnessProgram.governance.activeWaivers() });
});
router.post('/admin/repair', (req, res) => {
    const action = index_js_1.correctnessProgram.adminRepairs.queueAction(req.body);
    res.status(201).json(action);
});
router.post('/admin/repair/:id/approve', (req, res) => {
    const updated = index_js_1.correctnessProgram.adminRepairs.approve(req.params.id, req.body.approver);
    res.json(updated);
});
exports.default = router;
