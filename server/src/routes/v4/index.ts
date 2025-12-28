/**
 * Summit v4 API Routes
 *
 * Aggregates all v4.x API routes for the Summit platform.
 *
 * @module routes/v4
 * @version 4.0.0
 */

import { Router } from 'express';
import { aiGovernanceV4Router } from './ai-governance.js';
import { complianceV4Router } from './compliance.js';
import { zeroTrustV4Router } from './zero-trust.js';

const router = Router();

// AI-Assisted Governance (v4.0)
router.use('/ai', aiGovernanceV4Router);

// Cross-Domain Compliance (v4.1)
router.use('/compliance', complianceV4Router);

// Zero-Trust Security (v4.2)
router.use('/zero-trust', zeroTrustV4Router);

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

export default router;
export { router as v4Router };
