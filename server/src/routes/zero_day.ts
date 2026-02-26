
import { Request, Response, Router } from 'express';
import { getStringFromQuery } from '../utils/request';

const router = Router();

router.get('/alerts', async (req: Request, res: Response) => {
  const severity = getStringFromQuery(req.query.severity);
  res.json([
    { id: 'zd-1', name: 'Unknown Exploit', severity: severity || 'critical' }
  ]);
});

export default router;
