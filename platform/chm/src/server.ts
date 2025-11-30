import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { ChmConfig } from './config.js';
import { createDocument, evaluateExport, evaluateHandle, evaluateView, getDocument } from './rules.js';
import { createDowngradeRequest, approveDowngrade } from './workflows.js';
import { defaultTaxonomy, normalizeCode } from './taxonomy.js';

export interface ServerDeps {
  pool: Pool;
  config: ChmConfig;
}

export const createApp = ({ pool, config }: ServerDeps) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const app = express();
  app.use(helmet());
  app.use(bodyParser.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.post('/taxonomy/seed', async (_req: Request, res: Response) => {
    await Promise.all(
      defaultTaxonomy.map((level) =>
        pool.query(
          `INSERT INTO taxonomy_levels (code, name, max_duration_days)
           VALUES ($1, $2, $3)
           ON CONFLICT (code) DO UPDATE SET name = excluded.name, max_duration_days = excluded.max_duration_days`,
          [level.code, level.name, level.maxDurationDays]
        )
      )
    );
    res.json({ status: 'ok', count: defaultTaxonomy.length });
  });

  app.post('/documents', async (req: Request, res: Response) => {
    const { id, title, classificationCode, residency, license, derivedFrom, actor } = req.body;
    try {
      const documentId = id || uuidv4();
      await createDocument(
        pool,
        {
          id: documentId,
          title,
          classificationCode: normalizeCode(classificationCode),
          residency,
          license,
          derivedFrom: Boolean(derivedFrom)
        },
        actor || 'system'
      );
      res.status(201).json({ status: 'created', id: documentId });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/export/:id', async (req: Request, res: Response) => {
    const decision = await evaluateExport(pool, req.params.id, config);
    res.json(decision);
  });

  app.get('/rules/:id', async (req: Request, res: Response) => {
    const doc = await getDocument(pool, req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json({
      view: evaluateView(doc),
      handle: evaluateHandle(doc),
      export: await evaluateExport(pool, req.params.id, config)
    });
  });

  app.post('/downgrade/requests', async (req: Request, res: Response) => {
    const { documentId, requestedCode, justification, actor } = req.body;
    try {
      const id = await createDowngradeRequest(pool, {
        documentId,
        requestedCode,
        justification,
        actor: actor || 'system'
      });
      res.status(201).json({ id, status: 'pending' });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/downgrade/approve', async (req: Request, res: Response) => {
    const { requestId, approver } = req.body;
    try {
      const status = await approveDowngrade(pool, { requestId, approver });
      res.json({ status });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get('/audit/:documentId', async (req: Request, res: Response) => {
    const rows = await pool.query(
      `SELECT id, action, actor, details, created_at FROM audit_receipts WHERE document_id = $1 ORDER BY created_at DESC`,
      [req.params.documentId]
    );
    res.json(rows.rows);
  });

  return app;
};
