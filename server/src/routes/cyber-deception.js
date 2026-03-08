"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CyberDeceptionService_js_1 = require("../services/CyberDeceptionService.js");
const router = (0, express_1.Router)();
const service = CyberDeceptionService_js_1.CyberDeceptionService.getInstance();
// Register a new honeypot
router.post('/honeypots', async (req, res) => {
    try {
        const config = req.body;
        if (!config.name || !config.type || !config.location) {
            return res.status(400).json({ error: 'Missing required honeypot config fields' });
        }
        const honeypot = await service.registerHoneypot(config);
        res.status(201).json(honeypot);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Generate a new honeytoken
router.post('/tokens', async (req, res) => {
    try {
        const config = req.body;
        if (!config.type || !config.context) {
            return res.status(400).json({ error: 'Missing required token config fields' });
        }
        const token = await service.generateHoneyToken(config);
        res.status(201).json(token);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Record a deception event (webhook for honeypots)
router.post('/events', async (req, res) => {
    try {
        const { type, targetId, sourceIp, metadata } = req.body;
        if (!type || !targetId || !sourceIp) {
            return res.status(400).json({ error: 'Missing required event fields' });
        }
        const event = await service.recordInteraction(type, targetId, sourceIp, metadata);
        res.status(201).json(event);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get threat intelligence
router.get('/intelligence', (req, res) => {
    try {
        const intel = service.getThreatIntelligence();
        res.json(intel);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
