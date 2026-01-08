
import express from 'express';
import { systemBundleStore } from '../policy/bundleStore.js';

const router = express.Router();

router.get('/diagnostics/policy-bundle', async (req, res) => {
  try {
    const bundle = systemBundleStore.get();
    if (!bundle) {
      res.status(404).json({
        status: 'not_loaded',
        message: 'No system policy bundle loaded'
      });
      return;
    }

    res.json({
      status: 'loaded',
      verified: bundle.verified,
      bundle_id: bundle.manifest.bundle_id,
      created_at: bundle.manifest.created_at,
      files_count: bundle.manifest.files.length,
      signing_algorithm: bundle.manifest.signing_metadata.algorithm
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;
