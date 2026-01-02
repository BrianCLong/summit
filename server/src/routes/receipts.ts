import express from 'express';
import { ReceiptService } from '../services/ReceiptService.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const service = ReceiptService.getInstance();
    const receipt = await service.getReceipt(id);

    if (!receipt) {
       // Mock fallback for now as we don't have DB wiring for getReceipt
       return res.json({
           id,
           timestamp: new Date().toISOString(),
           action: 'mock_action',
           actor: 'mock_actor',
           resource: 'mock_resource',
           inputHash: 'mock_hash',
           signature: 'mock_signature',
           signerKeyId: 'mock_key_id',
           note: 'This is a synthetic receipt for demonstration.'
       });
    }

    res.json(receipt);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
