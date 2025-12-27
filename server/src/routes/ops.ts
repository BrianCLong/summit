import { Router } from 'express';
import { rollup } from '../ops/capacity';
import { verifyAuditLedgerChain } from '../audit/ledger.js';
import { evidenceIntegrityService } from '../evidence/integrity-service.js';

const r = Router();

r.get('/ops/capacity', async (req, res) => {
  const { tenant = 'acme', from, to } = req.query as any;
  if (!from || !to)
    return res.status(400).json({ error: 'from,to required (ISO)' });
  const out = await rollup(String(tenant), String(from), String(to));
  res.json(out);
});

r.get('/ops/audit-ledger/verify', async (req, res) => {
  if (process.env.AUDIT_CHAIN !== 'true') {
    return res.status(404).json({ error: 'AUDIT_CHAIN disabled' });
  }

  const since =
    typeof req.query.since === 'string' ? String(req.query.since) : undefined;
  const result = await verifyAuditLedgerChain({ since });
  return res.json(result);
});

r.post('/ops/evidence/verify', async (req, res) => {
  if (process.env.EVIDENCE_INTEGRITY !== 'true') {
    return res.status(404).json({ error: 'EVIDENCE_INTEGRITY disabled' });
  }

  const { chunkSize, rateLimitPerSecond, emitIncidents } = req.body || {};
  const result = await evidenceIntegrityService.verifyAll({
    chunkSize: chunkSize ? Number(chunkSize) : undefined,
    rateLimitPerSecond: rateLimitPerSecond ? Number(rateLimitPerSecond) : undefined,
    emitIncidents:
      emitIncidents ?? process.env.EVIDENCE_INTEGRITY_INCIDENTS === 'true',
  });

  return res.json({ success: true, data: result });
});

export default r;
