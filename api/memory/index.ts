import express, { Request, Response } from 'express';
import { MemoryBroker } from '../../core/memory/broker';
import { InMemoryMemoryStorage } from '../../core/memory/storage_memory';
import { Purpose, MemoryScope } from '../../core/memory/types';

const router = express.Router();
// For PR3, we use the in-memory storage. In a real implementation, this would connect to a persistent store.
const storage = new InMemoryMemoryStorage();
const broker = new MemoryBroker(storage);

const VALID_PURPOSES: Purpose[] = ["assist", "billing", "debug", "compliance", "research"];

function isValidPurpose(p: any): p is Purpose {
  return VALID_PURPOSES.includes(p);
}

/**
 * GET /v1/memory
 * List memories for a user, optionally filtered by contextSpace and purpose.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const contextSpace = req.query.contextSpace as string;
    const purpose = req.query.purpose;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (purpose && !isValidPurpose(purpose)) {
      return res.status(400).json({ error: `Invalid purpose: ${purpose}` });
    }

    const memories = await storage.list(userId, { contextSpace, purpose: purpose as Purpose });
    res.json(memories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /v1/memory/:id
 * Update a memory record (e.g., its facets).
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { facets } = req.body;
    const record = await storage.get(id);

    if (!record) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const updatedRecord = { ...record, facets: { ...record.facets, ...facets } };
    await storage.save(updatedRecord);
    res.json(updatedRecord);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /v1/memory/:id
 * Hard delete a memory record.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await storage.delete(id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /v1/memory/export
 * Export memories for a user in a given context space.
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { userId, contextSpace } = req.body;
    if (!userId || !contextSpace) {
      return res.status(400).json({ error: 'userId and contextSpace are required' });
    }

    const memories = await storage.list(userId, { contextSpace });
    // In a real implementation, this would be an encrypted signed bundle.
    const exportBundle = {
      userId,
      contextSpace,
      exportedAt: Date.now(),
      memories,
      signature: 'simulated-signature'
    };

    res.json(exportBundle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
