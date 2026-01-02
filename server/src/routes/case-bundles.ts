import { Router } from 'express';
import logger from '../config/logger.js';
import { CaseBundleService } from '../cases/bundles/CaseBundleService.js';
import { FixtureCaseBundleStore } from '../cases/bundles/FixtureCaseBundleStore.js';

const routeLogger = logger.child({ name: 'CaseBundleRoutes' });

function isCaseBundleEnabled(): boolean {
  return process.env.CASE_BUNDLE_V1 === '1';
}

const caseBundleRouter = Router();

caseBundleRouter.use((req, res, next) => {
  if (!isCaseBundleEnabled()) {
    return res.status(404).json({ error: 'case_bundle_v1_disabled' });
  }
  return next();
});

caseBundleRouter.post('/export', async (req, res) => {
  try {
    const { caseIds, include, format } = req.body || {};

    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ error: 'case_ids_required' });
    }

    const service = new CaseBundleService(new FixtureCaseBundleStore());
    const result = await service.exportCases(caseIds, { include, format });

    return res.json({
      ok: true,
      manifest: result.manifest,
      bundlePath: result.bundlePath,
      archivePath: result.archivePath,
    });
  } catch (error: any) {
    routeLogger.error({ err: error }, 'Failed to export case bundle');
    return res.status(500).json({ error: (error as Error).message });
  }
});

caseBundleRouter.post('/import', async (req, res) => {
  try {
    const { bundlePath, include, preserveIds, namespace } = req.body || {};

    if (!bundlePath) {
      return res.status(400).json({ error: 'bundle_path_required' });
    }

    const service = new CaseBundleService(new FixtureCaseBundleStore());
    const result = await service.importBundle(bundlePath, {
      include,
      preserveIds,
      namespace,
    });

    return res.json({
      ok: true,
      manifest: result.manifest,
      mapping: result.mapping,
      mappingPath: result.mappingPath,
      bundlePath: result.bundlePath,
    });
  } catch (error: any) {
    routeLogger.error({ err: error }, 'Failed to import case bundle');
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default caseBundleRouter;
