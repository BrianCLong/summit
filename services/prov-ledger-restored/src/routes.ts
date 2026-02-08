// @ts-nocheck
import { Router } from 'express';
import { addClaim, addEvidence, exportManifest } from './ledger';

const r = Router();

r.post('/ledger/evidence', async (req, res, next) => {
  try {
    const { sha256, contentType } = req.body;
    if (!sha256 || !contentType) {
      return res.status(400).json({ error: 'bad_request' });
    }
    const ev = await addEvidence(sha256, contentType);
    res.status(201).json(ev);
  } catch (e) {
    if ((e as Error)?.message?.startsWith('invalid_')) {
      return res.status(400).json({ error: (e as Error).message });
    }
    next(e);
  }
});

r.post('/ledger/claim', async (req, res, next) => {
  try {
    const { evidenceIds, transformChain } = req.body;
    if (!Array.isArray(evidenceIds) || !Array.isArray(transformChain)) {
      return res.status(400).json({ error: 'bad_request' });
    }
    const c = await addClaim(evidenceIds, transformChain);
    res.status(201).json(c);
  } catch (e) {
    if ((e as Error)?.message?.includes('required')) {
      return res.status(400).json({ error: (e as Error).message });
    }
    next(e);
  }
});

r.get('/ledger/export/:caseId', async (req, res, next) => {
  try {
    const b64 = await exportManifest(req.params.caseId);
    res.json({ manifest: b64 });
  } catch (e) {
    next(e);
  }
});

export default r;
