import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Evidence, Claim, Manifest, createManifest } from '@intelgraph/prov-ledger-lib';

const app = express();
app.use(express.json());

// In-memory database
const evidenceStore: Record<string, Evidence> = {};
const claimStore: Record<string, Claim> = {};
const manifestStore: Record<string, Manifest> = {};
const idempotencyStore: Record<string, { status: number; body: any }> = {};

app.post('/prov/evidence', (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (idempotencyKey && idempotencyStore[idempotencyKey]) {
    const { status, body } = idempotencyStore[idempotencyKey];
    return res.status(status).json(body);
  }

  const { hash, sourceMetadata, licenseTag, transforms } = req.body;
  const evidenceId = uuidv4();
  const evidence: Evidence = {
    evidenceId,
    hash,
    sourceMetadata,
    licenseTag,
    transforms,
    recordedAt: new Date().toISOString(),
  };
  evidenceStore[evidenceId] = evidence;

  if (idempotencyKey) {
    idempotencyStore[idempotencyKey] = { status: 201, body: evidence };
  }

  res.status(201).json(evidence);
});

app.post('/prov/claim', (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (idempotencyKey && idempotencyStore[idempotencyKey]) {
    const { status, body } = idempotencyStore[idempotencyKey];
    return res.status(status).json(body);
  }

  const { evidenceIds, confidence, statement, observedAt } = req.body;

  for (const evidenceId of evidenceIds) {
    if (!evidenceStore[evidenceId]) {
      const error = { error: `Evidence not found for ID: ${evidenceId}` };
      if (idempotencyKey) {
        idempotencyStore[idempotencyKey] = { status: 400, body: error };
      }
      return res.status(400).json(error);
    }
  }

  const claimId = uuidv4();
  const claim: Claim = {
    claimId,
    evidenceIds,
    confidence,
    statement,
    observedAt,
    recordedAt: new Date().toISOString(),
  };
  claimStore[claimId] = claim;

  if (idempotencyKey) {
    idempotencyStore[idempotencyKey] = { status: 201, body: claim };
  }

  res.status(201).json(claim);
});

app.get('/prov/manifest/:bundleId', (req, res) => {
  const { bundleId } = req.params;
  const manifest = manifestStore[bundleId];
  if (manifest) {
    res.json(manifest);
  } else {
    // If not found, create one on the fly from all evidence and claims
    const allEvidence = Object.values(evidenceStore);
    const allClaims = Object.values(claimStore);
    const newManifest = createManifest(bundleId, allEvidence, allClaims);
    manifestStore[bundleId] = newManifest;
    res.json(newManifest);
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(4001, () => {
    console.log('Provenance Ledger Server listening on port 4001');
  });
}

export default app;
