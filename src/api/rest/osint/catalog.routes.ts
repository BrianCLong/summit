import { Router } from 'express';
import { catalogStore } from '../../../connectors/osint-catalog/catalogStore.js';
import { validateOsintAsset } from '../../../policy/osint.js';

const router = Router();

router.post('/assets', async (req, res) => {
  try {
    const asset = req.body;

    // Validate asset against OSINT policy
    const validation = validateOsintAsset(asset);
    if (!validation.valid) {
        return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    await catalogStore.addAsset(asset);
    res.status(201).json(asset);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/assets', async (req, res) => {
  try {
    const query = {
      tag: req.query.tag as string,
      license: req.query.license as string,
      shareability: req.query.shareability as string,
    };
    const assets = await catalogStore.searchAssets(query);
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
