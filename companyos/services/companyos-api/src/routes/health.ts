import type { Request, Response } from 'express';

export function healthRoute(req: Request, res: Response) {
  res.json({
    status: 'ok',
    service: 'companyos-api',
    time: new Date().toISOString(),
  });
}
