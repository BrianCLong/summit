import { Router } from 'express';

export default function createHealth(db?: { $queryRaw?: Function }) {
  const r = Router();

  r.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

  r.get('/readyz', async (_req, res) => {
    try {
      if (db?.$queryRaw) await (db.$queryRaw as any)`SELECT 1`;
      return res.status(200).json({ ready: true });
    } catch (e) {
      return res
        .status(503)
        .json({ ready: false, error: (e as Error).message });
    }
  });

  return r;
}
