
import { Router } from 'express';
import { AttestationEngine } from '../engine/AttestationEngine.js';
import { ProvenanceLedgerV2 } from '../../provenance/ledger.js';
import { ProvenanceClaimProvider } from '../engine/ProvenanceClaimProvider.js';
import { SecurityClaimProvider } from '../engine/SecurityClaimProvider.js';
import { GovernanceClaimProvider } from '../engine/GovernanceClaimProvider.js';
import { OperationsClaimProvider } from '../engine/OperationsClaimProvider.js';

const router = Router();
const engine = AttestationEngine.getInstance();

// Initialize providers
engine.registerProvider(new ProvenanceClaimProvider(ProvenanceLedgerV2.getInstance()));
engine.registerProvider(new SecurityClaimProvider());
engine.registerProvider(new GovernanceClaimProvider());
engine.registerProvider(new OperationsClaimProvider());

// GET /api/assurance/keys
// Expose Public Key for offline verification
router.get('/keys', (req, res) => {
  const publicKey = engine.getPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: 'Keys not configured' });
  }
  res.json({ publicKey });
});

// POST /api/assurance/attestation
// Generates a NEW attestation
router.post('/attestation', async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized: Tenant context required' });
    }

    const profileId = req.query.profile as string | undefined;

    const attestation = await engine.generateAttestation(tenantId, profileId);
    res.json(attestation);
  } catch (error: any) {
    console.error('Attestation failed', error);
    res.status(500).json({ error: error.message || 'Failed to generate attestation' });
  }
});

// GET /api/assurance/attestation/latest
// Convenience to get latest valid
router.get('/attestation/latest', async (req, res) => {
    try {
        const tenantId = (req as any).user?.tenantId;
        if (!tenantId) {
          return res.status(401).json({ error: 'Unauthorized: Tenant context required' });
        }

        const profileId = req.query.profile as string | undefined;
        const history = await engine.listAttestations(tenantId, profileId);

        // Return latest
        if (history.length > 0) {
            res.json(history[0]);
        } else {
            res.status(404).json({ error: 'No attestations found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve attestation' });
    }
});

// GET /api/assurance/history
// Lists PAST attestations
router.get('/history', async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized: Tenant context required' });
    }

    const profileId = req.query.profile as string | undefined;
    const attestations = await engine.listAttestations(tenantId, profileId);
    res.json(attestations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list attestations' });
  }
});

// GET /api/assurance/history/:id
// Gets a specific past attestation
router.get('/history/:id', async (req, res) => {
  try {
     const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized: Tenant context required' });
    }

    const attestation = await engine.getAttestation(req.params.id);
    if (!attestation) {
      return res.status(404).json({ error: 'Attestation not found' });
    }

    // Ensure tenant isolation
    if (attestation.tenantId !== tenantId) {
       return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(attestation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve attestation' });
  }
});

// POST /api/assurance/verify
router.post('/verify', async (req, res) => {
  try {
    const attestation = req.body;
    const isValid = await engine.verifyAttestation(attestation);
    res.json({ valid: isValid });
  } catch (error) {
    res.status(400).json({ error: 'Verification failed' });
  }
});

export default router;
