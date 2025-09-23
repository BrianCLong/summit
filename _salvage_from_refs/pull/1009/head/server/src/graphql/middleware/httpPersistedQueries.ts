import { getRedisClient } from '../../db/redis.js';
import { persistedQueryHitsTotal } from '../../monitoring/metrics.js';

const redis = getRedisClient();

export default async function httpPersistedQueries(req: any, res: any, next: any) {
  if (!req.body) return next();
  const id = req.body.id;
  if (process.env.NODE_ENV === 'production') {
    if (!id) {
      return res.status(400).json({ error: 'Persisted query ID required' });
    }
    const query = await redis.get(`pq:${id}`);
    if (!query) {
      return res.status(400).json({ error: 'Persisted query not found' });
    }
    req.body.query = query;
    persistedQueryHitsTotal.inc();
    return next();
  }

  if (id && !req.body.query) {
    const query = await redis.get(`pq:${id}`);
    if (query) {
      req.body.query = query;
      persistedQueryHitsTotal.inc();
    }
  }
  return next();
}
