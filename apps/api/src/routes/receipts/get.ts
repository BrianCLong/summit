import { Router } from 'express';
import type {
  ProvenanceReceipt,
  UnsignedReceipt,
} from '@intelgraph/provenance';
import { ReceiptSigner } from '@intelgraph/receipt-signer';

export interface ReceiptRepository {
  findById(id: string): Promise<UnsignedReceipt | null>;
}

export class InMemoryReceiptRepository implements ReceiptRepository {
  constructor(private readonly receipts: UnsignedReceipt[]) {}

  async findById(id: string): Promise<UnsignedReceipt | null> {
    const receipt = this.receipts.find((entry) => entry.id === id);
    return receipt ? { ...receipt } : null;
  }
}

export interface ReceiptRouteDependencies {
  repository: ReceiptRepository;
  signer: ReceiptSigner;
}

export function createReceiptRouter(
  deps: ReceiptRouteDependencies,
): Router {
  const router = Router();

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const unsigned = await deps.repository.findById(id);

      if (!unsigned) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      const signed = await deps.signer.sign(unsigned);
      const response: ProvenanceReceipt = {
        ...signed,
      };

      res.json({
        id: response.id,
        schemaVersion: response.schemaVersion,
        issuer: response.issuer,
        subject: response.subject,
        issuedAt: response.issuedAt,
        expiresAt: response.expiresAt,
        payload: response.payload,
        signature: response.signature,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch receipt',
        detail: error instanceof Error ? error.message : 'unknown',
      });
    }
  });

  return router;
}
