"use strict";
/**
 * Summit v4 API Routes
 *
 * Aggregates all v4.x API routes for the Summit platform.
 *
 * @module routes/v4
 * @version 4.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.v4Router = void 0;
const express_1 = require("express");
const ai_governance_js_1 = require("./ai-governance.js");
const compliance_js_1 = require("./compliance.js");
const zero_trust_js_1 = require("./zero-trust.js");
const router = (0, express_1.Router)();
exports.v4Router = router;
// AI-Assisted Governance (v4.0)
router.use('/ai', ai_governance_js_1.aiGovernanceV4Router);
// Cross-Domain Compliance (v4.1)
router.use('/compliance', compliance_js_1.complianceV4Router);
// Zero-Trust Security (v4.2)
router.use('/zero-trust', zero_trust_js_1.zeroTrustV4Router);
// Version info endpoint
router.get('/version', (_req, res) => {
    res.json({
        version: '4.0.0',
        pillars: {
            'ai-governance': { version: '4.0.0', status: 'stable' },
            'compliance': { version: '4.1.0', status: 'beta' },
            'zero-trust': { version: '4.2.0', status: 'alpha' },
        },
        releaseDate: '2025-01-15',
        documentation: '/api-docs#/v4',
    });
});
exports.default = router;
