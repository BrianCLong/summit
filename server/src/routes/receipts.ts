import express from 'express';
import { ReceiptService } from '../services/ReceiptService.js';
import { bundleExporter } from '../exports/bundle-exporter.js';

const router = express.Router();

// GET /receipts/:id/export - Export evidence bundle for a receipt
router.get('/:id/export', async (req, res) => {
  try {
    const id = req.params.id;
    const tenantId = (req as any).user?.tenantId || (req as any).user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const bundle = await bundleExporter.exportReceipt(id, tenantId);
    res.json(bundle);
  } catch (error: any) {
    console.error('Export failed:', error);
    res.status(500).json({ error: 'Export failed', message: error.message });
  }
});

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
