import { Router } from 'express';
import {
  RSSP_ATTESTATIONS,
  RSSP_PUBLIC_KEY,
  getAttestationById,
  RSSPAttestation,
} from '../transparency/rssp/attestations.js';
import { materializeExport, verifyAttestation } from '../transparency/rssp/verification.js';
import { regulatorOnlyGuard } from '../transparency/rssp/guard.js';

interface AttestationSummary {
  id: string;
  type: string;
  title: string;
  summary: string;
  issuedAt: string;
  jurisdiction: string[];
  retentionPolicy: string;
  payloadHash: string;
  exportHash: string;
  verification: {
    algorithm: string;
    signature: string;
  };
}

function toSummary(attestation: RSSPAttestation): AttestationSummary {
  const { id, type, title, summary, issuedAt, jurisdiction, retentionPolicy, payloadHash, exportHash, verification } =
    attestation;
  return {
    id,
    type,
    title,
    summary,
    issuedAt,
    jurisdiction,
    retentionPolicy,
    payloadHash,
    exportHash,
    verification: {
      algorithm: verification.algorithm,
      signature: verification.signature,
    },
  };
}

export const rsspRouter = Router();

rsspRouter.use(regulatorOnlyGuard);

rsspRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    datasetVersion: '2025-Q1',
    attestationCount: RSSP_ATTESTATIONS.length,
    publicKeyFingerprint: RSSP_PUBLIC_KEY.replace(/[^A-Za-z0-9+/=]/g, '').slice(-16),
  });
});

rsspRouter.get('/public-key', (_req, res) => {
  res.json({ publicKey: RSSP_PUBLIC_KEY });
});

rsspRouter.get('/attestations', (_req, res) => {
  res.json({ attestations: RSSP_ATTESTATIONS.map(toSummary) });
});

rsspRouter.get('/attestations/:id', (req, res) => {
  const attestation = getAttestationById(req.params.id);
  if (!attestation) {
    return res.status(404).json({ error: 'not_found', message: 'Attestation not found.' });
  }

  const { exportPack, ...rest } = attestation;
  res.json({
    ...rest,
    exportPackBytes: Buffer.byteLength(materializeExport(attestation)),
  });
});

rsspRouter.get('/attestations/:id/export', (req, res) => {
  const attestation = getAttestationById(req.params.id);
  if (!attestation) {
    return res.status(404).json({ error: 'not_found', message: 'Attestation not found.' });
  }

  const buffer = materializeExport(attestation);
  res
    .set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${attestation.id}-export.json"`,
      'X-Artifact-Sha256': attestation.exportHash,
    })
    .send(buffer);
});

rsspRouter.post('/attestations/:id/verify', (req, res) => {
  const attestation = getAttestationById(req.params.id);
  if (!attestation) {
    return res.status(404).json({ error: 'not_found', message: 'Attestation not found.' });
  }

  const result = verifyAttestation(attestation);
  res.json({
    attestationId: attestation.id,
    result,
  });
});

export default rsspRouter;
