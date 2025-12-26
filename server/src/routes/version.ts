import { Router } from 'express';
import { buildVersionResponse } from '../middleware/api-versioning.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(buildVersionResponse());
});

export default router;
