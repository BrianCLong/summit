import { Router } from 'express';
import { evaluateDisclosureExport } from '../authz/opa-client.js';
import type { SubjectAttributes } from '../authz/types.js';
import { disclosurePacks, findDisclosurePack } from './data.js';

export const disclosureRouter = Router();

disclosureRouter.get('/disclosure-packs', (_req, res) => {
  res.json({ data: disclosurePacks });
});

disclosureRouter.get('/disclosure-packs/:id/export', async (req, res) => {
  const pack = findDisclosurePack(req.params.id);
  const subject = req.subject as SubjectAttributes | undefined;

  if (!pack) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (!subject) {
    return res.status(401).json({ error: 'subject_missing' });
  }

  const decision = await evaluateDisclosureExport({
    action: 'disclosure:export',
    resource: {
      type: 'disclosure_pack',
      tenant_id: pack.tenant_id,
      residency_region: pack.residency_region,
    },
    subject,
  });

  if (!decision.allow) {
    return res
      .status(403)
      .json({ error: 'forbidden', reason: decision.reason ?? 'forbidden' });
  }

  const body = JSON.stringify({ id: pack.id, ...pack.contents }, null, 2);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="disclosure-${pack.id}.json"`,
  );
  return res.send(body);
});
