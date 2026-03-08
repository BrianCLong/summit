"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SIEMPlatform_js_1 = require("../siem/SIEMPlatform.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Apply auth
router.use(auth_js_1.authMiddleware);
// Ingest Event
router.post('/ingest', async (req, res, next) => {
    try {
        const event = await SIEMPlatform_js_1.siemPlatform.ingestEvent({
            ...req.body,
            tenantId: req.user?.tenantId || req.body.tenantId,
            source: req.body.source || 'api'
        });
        res.json({ success: true, eventId: event.id });
    }
    catch (err) {
        next(err);
    }
});
// Get Alerts
router.get('/alerts', (req, res) => {
    const alerts = SIEMPlatform_js_1.siemPlatform.getAlerts({});
    res.json({ data: alerts });
});
// Get Events
router.get('/events', (req, res) => {
    const events = SIEMPlatform_js_1.siemPlatform.getEvents({});
    res.json({ data: events });
});
// Get Compliance Report (Mock)
router.get('/compliance/report', (req, res) => {
    // Generate a mock report
    const report = {
        generatedAt: new Date(),
        complianceScore: 95,
        violations: [],
        status: 'compliant'
    };
    res.json(report);
});
exports.default = router;
