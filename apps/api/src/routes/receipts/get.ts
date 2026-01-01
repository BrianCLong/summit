import { Router } from 'express';

import { RBACManager } from '../../../../../packages/authentication/src/rbac/rbac-manager.js';
import { requirePermission } from '../../middleware/security.js';

export interface ReceiptStore {
  get(id: string): Promise<unknown> | unknown;
}

export interface ReceiptVerifier {
  verify(receipt: unknown): Promise<boolean> | boolean;
}

export interface GetReceiptDependencies {
  store: ReceiptStore;
  verifier: ReceiptVerifier;
  rbacManager: RBACManager;
}

export const createGetReceiptRouter = ({
  store,
  verifier,
  rbacManager,
}: GetReceiptDependencies) => {
  const router = Router();

  router.get('/:id', requirePermission(rbacManager, 'receipts', 'read'), async (req, res) => {
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
