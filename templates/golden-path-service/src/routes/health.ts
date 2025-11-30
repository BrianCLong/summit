import { Request, Response, Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

healthRouter.get('/readyz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ready' });
});
