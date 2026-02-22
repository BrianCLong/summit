import { Router } from 'express';
import { ReceiptService } from '../services/receiptService';

export function createReceiptRoutes(receiptService: ReceiptService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const receipt = await receiptService.createReceipt(req.body);
      res.status(201).json(receipt);
    } catch (error) {
      console.error('Error creating receipt:', error);
      res.status(500).json({ error: 'Failed to create receipt' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const { tenantId, actorId, actionType } = req.query;
      const receipts = await receiptService.listReceipts({
        tenantId: tenantId as string,
        actorId: actorId as string,
        actionType: actionType as string,
      });
      res.json(receipts);
    } catch (error) {
      console.error('Error listing receipts:', error);
      res.status(500).json({ error: 'Failed to list receipts' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const receipt = await receiptService.getReceipt(req.params.id);
      if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
      res.json(receipt);
    } catch (error) {
      console.error('Error getting receipt:', error);
      res.status(500).json({ error: 'Failed to get receipt' });
    }
  });

  return router;
}
