"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DefensivePsyOpsService_js_1 = require("../services/DefensivePsyOpsService.js");
const auth_js_1 = require("../middleware/auth.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
const psyOpsService = new DefensivePsyOpsService_js_1.DefensivePsyOpsService();
// Get active threats
router.get('/threats', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const threats = await psyOpsService.getActiveThreats();
        res.json(threats);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch threats' });
    }
});
// Manual scan
router.post('/scan', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { content, source } = req.body;
        if (!content)
            return res.status(400).json({ error: 'Content is required' });
        const threat = await psyOpsService.detectPsychologicalThreats(content, {
            source: source || 'MANUAL_SCAN',
            user: req.user,
        });
        if (threat) {
            res.status(200).json({ detected: true, threat });
        }
        else {
            res.status(200).json({ detected: false });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Scan failed' });
    }
});
// Resolve threat
router.post('/threats/:id/resolve', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { notes } = req.body;
        await psyOpsService.resolveThreat(id, notes || 'Resolved by user');
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Resolution failed' });
    }
});
exports.default = router;
