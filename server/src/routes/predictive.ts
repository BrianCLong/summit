import express from 'express';
import { PredictiveService } from '../predictive/PredictiveService';
import { ForecastRequest, WhatIfRequest, SimulationRequest } from '../contracts/predictive/types';

// Assuming we have some auth middleware available, otherwise we skip for now
// or implement a mock one. Prompt says "All APIs must accept a 'legal basis' token".
// We'll extract it from body or headers.

const router = express.Router();
const service = new PredictiveService();

import { auditLogger } from '../middleware/audit-logger';

// Middleware to ensure legal basis is present
const requireLegalBasis = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const legalBasis = req.body.legalBasis;
    if (!legalBasis || !legalBasis.purpose || !legalBasis.policyId) {
        return res.status(403).json({ error: "Missing or invalid Legal Basis token" });
    }

    // Log the legal basis context for audit compliance
    // Forwarding to Security/Governance via audit log
    // In a future iteration, this would be a synchronous check against OPA or PolicyService
    // For now, we ensure it's recorded.
    if ((req as any).log) {
       (req as any).log.info({ legalBasis }, "Predictive Service Access Authorized via Legal Basis");
    } else {
       console.info("Predictive Service Access Authorized via Legal Basis", legalBasis);
    }

    next();
};

router.post('/forecast/risk', requireLegalBasis, async (req, res) => {
    try {
        const body = req.body as ForecastRequest;
        if (body.horizon > 365) {
            return res.status(400).json({ error: "Horizon limit exceeded (max 365)" });
        }
        const result = await service.forecastRisk(body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/simulate/what-if', requireLegalBasis, async (req, res) => {
    try {
        const body = req.body as WhatIfRequest;
        if (body.injectedNodes && body.injectedNodes.length > 1000) {
            return res.status(400).json({ error: "Injection limit exceeded (max 1000 nodes)" });
        }
        const result = await service.simulateWhatIf(body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/simulate/campaign', requireLegalBasis, async (req, res) => {
    try {
        const body = req.body as SimulationRequest;
        if (body.steps > 100) {
            return res.status(400).json({ error: "Simulation steps limit exceeded (max 100)" });
        }
        const result = await service.simulateCampaign(body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
