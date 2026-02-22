import express, { Request, Response } from 'express';
import pino from 'pino';
import { ReceiptStore } from './store';

export function createReceiptRouter(store: ReceiptStore, logger = pino()): express.Router {
  const router = express.Router();

  router.get('/:id', (req: Request, res: Response) => {
    const receipt = store.get(req.params.id);
    if (!receipt) {
      logger.warn({ id: req.params.id }, 'Receipt not found');
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json(receipt);
  });

  router.post('/export', (req: Request, res: Response) => {
    const { id, redactions, reason } = req.body as {
      id?: string;
      redactions?: string[];
      reason?: string;
    };
    if (!id) {
      return res.status(400).json({ error: 'id_required' });
    }
    const bundle = store.export({ id, redactions, reason });
    if (!bundle) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json({
      receipt: bundle.receipt,
      artifacts: Object.keys(bundle.artifacts),
      disclosure: bundle.receipt.disclosure,
    });
  });

  return router;
}
