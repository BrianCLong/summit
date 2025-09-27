import { Router } from 'express';
import { emitAlert } from '../graphql/resolvers/actions.publish';
export const devRouter = Router();
devRouter.post('/emit-alert', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  await emitAlert({ ...req.body, ts: new Date().toISOString() });
  res.json({ ok: true });
});
