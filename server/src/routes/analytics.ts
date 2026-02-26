import { RequestHandler } from 'express';
import { Request, Response, Router } from 'express';
import { getStringFromQuery } from '../utils/request';

const router = Router();

const getAnalyticsSummary: RequestHandler = async (req, res) => {
  try {
    const timeframe = getStringFromQuery(req.query.timeframe);
    res.json({
      timeframe: timeframe || '24h',
      metrics: {
        activeUsers: 100,
        events: 5000
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

router.get('/summary', getAnalyticsSummary);

export default router;
