import { Router } from 'express';
import { rollup } from '../ops/capacity';
import { verifyAuditLedgerChain } from '../audit/ledger.js';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';
import {
  policyHotReloadEnabled,
  loadAndValidatePolicyBundle,
} from '../policy/loader.js';
import {
  policyBundleStore,
  rollbackPolicyBundle,
} from '../policy/policyBundleStore.js';
import { emitAuditEvent } from '../audit/emit.js';

const r = Router();

const adminGuard = [ensureAuthenticated, ensureRole(['admin'])];

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

r.post('/ops/policy/reload', adminGuard, async (req, res) => {
  if (!policyHotReloadEnabled()) {
    return res.status(404).json({ error: 'POLICY_HOT_RELOAD disabled' });
  }
  const { bundlePath, signaturePath } = req.body || {};
  if (!bundlePath) {
    return res.status(400).json({ error: 'bundlePath is required' });
  }

  try {
    await policyBundleStore.loadFromDisk();
    const { bundle, verification } = await loadAndValidatePolicyBundle(
      bundlePath,
      signaturePath,
    );
    const record = await policyBundleStore.upsertBundle(bundle, verification, true);
    await emitAuditEvent(
      {
        eventId: `policy-reload-${record.versionId}`,
        occurredAt: new Date().toISOString(),
        actor: {
          id: req.user?.id || 'system',
          type: 'user',
          ipAddress: req.ip,
        },
        action: { type: 'policy.reload', outcome: 'success' },
        target: {
          type: 'policy',
          id: record.versionId,
          path: bundle.baseProfile.regoPackage,
        },
        metadata: { digest: record.digest, signatureVerified: record.signatureVerified },
        tenantId: req.user?.tenantId || 'system',
      },
      { level: 'critical' },
    );

    return res.json({
      ok: true,
      currentPolicyVersionId: record.versionId,
      digest: record.digest,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

r.post('/ops/policy/rollback', adminGuard, async (req, res) => {
  if (!policyHotReloadEnabled()) {
    return res.status(404).json({ error: 'POLICY_HOT_RELOAD disabled' });
  }
  const target = typeof req.query.toVersion === 'string' ? req.query.toVersion : undefined;
  try {
    const record = await rollbackPolicyBundle(target);
    await emitAuditEvent(
      {
        eventId: `policy-rollback-${record.versionId}`,
        occurredAt: new Date().toISOString(),
        actor: {
          id: req.user?.id || 'system',
          type: 'user',
          ipAddress: req.ip,
        },
        action: { type: 'policy.rollback', outcome: 'success' },
        target: { type: 'policy', id: record.versionId },
        metadata: { digest: record.digest, signatureVerified: record.signatureVerified },
        tenantId: req.user?.tenantId || 'system',
      },
      { level: 'critical' },
    );
    return res.json({ ok: true, currentPolicyVersionId: record.versionId });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default r;
