import express from 'express';
import { ReceiptService } from '../services/ReceiptService.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const service = ReceiptService.getInstance();
    const receipt = await service.getReceipt(id);

    if (!receipt) {
       return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
