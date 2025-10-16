import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';
import { postgresPool } from '../db/postgres.js';

type Annotation = { id: string; range: string; note: string; author?: string };
const ann: Record<string, Annotation[]> = {};

export const evidenceRouter = Router();

evidenceRouter.get(
  '/:id/annotations',
  requirePermission('investigation:read'),
  async (req, res) => {
    const eid = req.params.id;
    try {
      if (process.env.USE_DB === 'true') {
        const rows = await postgresPool.findMany<any>(
          'evidence_annotations',
          { evidence_id: eid },
          { orderBy: 'created_at desc' },
        );
        return res.json({
          items: rows.map((r) => ({
            id: r.id,
            range: r.range,
            note: r.note,
            author: r.author,
          })),
        });
      }
      res.json({ items: ann[eid] || [] });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  },
);

evidenceRouter.post(
  '/:id/annotations',
  requirePermission('investigation:update'),
  async (req, res) => {
    const id = Math.random().toString(36).slice(2, 10);
    const evidenceId = req.params.id;
    const a: Annotation = {
      id,
      range: String(req.body?.range || ''),
      note: String(req.body?.note || ''),
      author: (req as any)?.user?.email,
    };
    try {
      if (process.env.USE_DB === 'true') {
        await postgresPool.insert('evidence_annotations', {
          id,
          evidence_id: evidenceId,
          range: a.range,
          note: a.note,
          author: a.author,
        });
      } else {
        ann[evidenceId] = ann[evidenceId] || [];
        ann[evidenceId].push(a);
      }
      auditLog(req, 'evidence.annotate', {
        evidence: evidenceId,
        annotation: a.id,
      });
      res.json({ ok: true, annotation: a });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  },
);

evidenceRouter.get('/:id/pdf', requirePermission('data:export'), (req, res) => {
  auditLog(req, 'evidence.pdf.export', { id: req.params.id });
  res.json({ ok: true, url: `/downloads/${req.params.id}.pdf` });
});
