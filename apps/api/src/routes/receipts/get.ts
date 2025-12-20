import { Router } from 'express';

import {
  ReceiptStore,
  ReceiptVerifier,
} from '@intelgraph/receipt-signer';

export interface GetReceiptDependencies {
  store: ReceiptStore;
  verifier: ReceiptVerifier;
}

export const createGetReceiptRouter = ({
  store,
  verifier,
}: GetReceiptDependencies) => {
  const router = Router();

  router.get('/:id', async (req, res) => {
    try {
      const receipt = await store.get(req.params.id);
      if (!receipt) {
        return res.status(404).json({
          error: 'Receipt not found',
          id: req.params.id,
        });
      }

      const verified = await verifier.verify(receipt);

      return res.json({ receipt, verified });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to load receipt',
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred',
      });
    }
  });

  return router;
};

export default createGetReceiptRouter;
