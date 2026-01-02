// @ts-nocheck
import { Router, type Request, type Response } from 'express';
import { modelRegistry } from '../mlops/registry.js';
import { modelServing } from '../mlops/serving.js';
import { featureStore } from '../mlops/feature_store.js';
import { trainingPipeline } from '../mlops/pipeline.js';
import { ensureAuthenticated } from '../middleware/auth.js';

// Extend Express Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId?: string;
    role?: string;
    email?: string;
  };
}

const router = Router();

// Middleware to ensure user is authenticated
router.use(ensureAuthenticated);

/**
 * @route POST /mlops/models
 * @desc Register a new model
 */
router.post('/models', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, description, domain, framework } = req.body;
    const tenantId = authReq.user?.tenantId || 'default';

    const id = await modelRegistry.registerModel(tenantId, {
      name, description, domain, framework,
      owner: authReq.user?.id || 'system'
    });

    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @route POST /mlops/predict
 * @desc Get predictions from a model
 */
router.post('/predict', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { modelName, version, inputs, options } = req.body;
    const tenantId = authReq.user?.tenantId || 'default';

    const result = await modelServing.predict(tenantId, {
      modelName,
      version,
      inputs,
      options
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @route POST /mlops/features
 * @desc Ingest features
 */
router.post('/features/ingest', async (req: Request, res: Response) => {
  try {
    const { featureSet, entityId, values } = req.body;
    await featureStore.ingestFeatures(featureSet, entityId, values);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @route POST /mlops/train
 * @desc Trigger a training job
 */
router.post('/train', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { modelName, datasetId, parameters } = req.body;
    const tenantId = authReq.user?.tenantId || 'default';

    const jobId = await trainingPipeline.triggerRetraining(
        tenantId, modelName, datasetId, parameters
    );

    res.json({ jobId });
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
