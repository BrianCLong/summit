import { Router } from 'express';

const router = Router();

/**
 * GET /api/rest/infowar/sitrep/:id
 * returns SITREP + evidence index
 */
router.get('/sitrep/:id', async (req, res) => {
  const { id } = req.params;

  // Feature flag check
  if (process.env.FEATURE_INFOWAR_API !== 'true') {
    return res.status(403).json({ error: 'INFOWAR_API feature flagged OFF' });
  }

  console.log(`[AUDIT] INFOWAR_SITREP_VIEWED: ${id}`);

  // Stub response
  res.json({
    id,
    type: 'Monthly SITREP',
    generatedAt: new Date().toISOString(),
    evidenceIndex: {
      version: "1.0",
      item_slug: "INFOWAR",
      entries: []
    }
  });
});

export default router;
