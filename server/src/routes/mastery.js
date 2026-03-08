"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MasteryService_js_1 = require("../mastery/MasteryService.js");
const auth_js_1 = require("../middleware/auth.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = express_1.default.Router();
router.get('/labs', auth_js_1.ensureAuthenticated, (req, res) => {
    res.json(MasteryService_js_1.masteryService.getLabs());
});
router.post('/labs/:labId/start', auth_js_1.ensureAuthenticated, (req, res) => {
    try {
        const run = MasteryService_js_1.masteryService.startLab((0, http_param_js_1.firstStringOr)(req.params.labId, ''), req.user.id, req.user.tenantId);
        res.json(run);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/runs', auth_js_1.ensureAuthenticated, (req, res) => {
    const runs = MasteryService_js_1.masteryService.getUserRuns(req.user.id);
    res.json(runs);
});
router.get('/runs/:runId', auth_js_1.ensureAuthenticated, (req, res) => {
    const run = MasteryService_js_1.masteryService.getRun((0, http_param_js_1.firstStringOr)(req.params.runId, ''));
    if (!run || run.userId !== req.user.id) {
        return res.status(404).json({ error: 'Run not found' });
    }
    res.json(run);
});
router.post('/runs/:runId/steps/:stepId/validate', auth_js_1.ensureAuthenticated, async (req, res) => {
    const run = MasteryService_js_1.masteryService.getRun((0, http_param_js_1.firstStringOr)(req.params.runId, ''));
    if (!run || run.userId !== req.user.id) {
        return res.status(404).json({ error: 'Run not found' });
    }
    try {
        const result = await MasteryService_js_1.masteryService.validateStep((0, http_param_js_1.firstStringOr)(req.params.runId, ''), (0, http_param_js_1.firstStringOr)(req.params.stepId, ''));
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/certificates', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const certs = await MasteryService_js_1.masteryService.getUserCertificates(req.user.id, req.user.tenantId);
        res.json(certs);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch certificates' });
    }
});
router.get('/coaching', auth_js_1.ensureAuthenticated, (req, res) => {
    const tripwire = (0, http_param_js_1.firstString)(req.query.tripwire);
    if (tripwire) {
        res.json(MasteryService_js_1.masteryService.getSuggestedLabs(tripwire));
    }
    else {
        res.json([]);
    }
});
router.get('/admin/stats', auth_js_1.ensureAuthenticated, (0, auth_js_1.ensureRole)('admin'), (req, res) => {
    const runs = MasteryService_js_1.masteryService.getAllRuns();
    // Aggregate stats
    const stats = {
        totalRuns: runs.length,
        completedRuns: runs.filter(r => r.status === 'completed').length,
        byLab: {}
    };
    runs.forEach(r => {
        if (!stats.byLab[r.labId])
            stats.byLab[r.labId] = { started: 0, completed: 0 };
        stats.byLab[r.labId].started++;
        if (r.status === 'completed')
            stats.byLab[r.labId].completed++;
    });
    res.json(stats);
});
exports.default = router;
