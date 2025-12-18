
import { Router } from 'express';
import { ComplianceScanner } from '../products/ComplianceForge/ComplianceScanner.js';
import { ArtifactGenerator } from '../products/ComplianceForge/ArtifactGenerator.js';

const router = Router();
const scanner = new ComplianceScanner();
const generator = new ArtifactGenerator();

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
    } catch (error) {
        console.error('Compliance scan error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
