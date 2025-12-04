import { Router } from 'express';
import { evaluateDisclosureExport } from '../authz/disclosure-export.js';
import type { DisclosurePackResource } from '../authz/types.js';

const DISCLOSURE_PACKS: DisclosurePackResource[] = [
  {
    id: 'pack-us-001',
    type: 'disclosure_pack',
    name: 'US disclosure pack',
    tenant_id: 'tenant_demo',
    residency_region: 'us',
  },
  {
    id: 'pack-eu-002',
    type: 'disclosure_pack',
    name: 'EU disclosure pack',
    tenant_id: 'tenant_demo',
    residency_region: 'eu',
  },
];

export function createDisclosurePackRouter() {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ data: DISCLOSURE_PACKS });
  });

  router.get('/:id/export', async (req, res) => {
    const pack = DISCLOSURE_PACKS.find((p) => p.id === req.params.id);

    if (!pack) {
      return res.status(404).json({ error: 'not_found' });
    }

    if (!req.subject) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const decision = await evaluateDisclosureExport(req.subject, pack);

    if (!decision.allow) {
      return res.status(403).json({ reason: decision.reason });
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="disclosure-${pack.id}.json"`,
    );
    res.type('application/json');
    res.send(
      JSON.stringify({
        id: pack.id,
        name: pack.name,
        residency_region: pack.residency_region,
        tenant_id: pack.tenant_id,
        exported_at: new Date().toISOString(),
      }),
    );
  });

  return router;
}
