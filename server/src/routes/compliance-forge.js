"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ComplianceScanner_js_1 = require("../products/ComplianceForge/ComplianceScanner.js");
const ArtifactGenerator_js_1 = require("../products/ComplianceForge/ArtifactGenerator.js");
const router = (0, express_1.Router)();
const scanner = new ComplianceScanner_js_1.ComplianceScanner();
const generator = new ArtifactGenerator_js_1.ArtifactGenerator();
/**
 * @route POST /api/compliance-forge/scan
 * @description Scans simulated files and generates audit artifacts.
 */
router.post('/scan', async (req, res) => {
    try {
        const { files, standard } = req.body; // files is { "filename": "content" }
        if (!files || !standard) {
            return res.status(400).json({ error: 'Missing files or standard' });
        }
        const scanResults = await scanner.scanRepo(files);
        const allRisks = scanResults.flatMap(r => r.risks);
        const artifact = generator.generateAuditTrail(standard, allRisks);
        res.json({
            scanResults,
            artifact,
            overallStatus: artifact.status
        });
    }
    catch (error) {
        console.error('Compliance scan error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
