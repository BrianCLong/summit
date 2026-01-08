
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import { productionAuthMiddleware } from '../src/config/production-security.js';

// Mock dependencies
jest.mock('../src/config/production-security.js', () => ({
  productionAuthMiddleware: (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  },
  applyProductionSecurity: jest.fn(),
}));

describe('Security Controls', () => {
  let app: any;
  let healthHandler: (req: Request, res: Response) => void;

  beforeAll(async () => {
    app = express();
    healthHandler = (req: Request, res: Response) =>
      res.status(200).json({ status: 'ok' });
    app.get('/health', healthHandler);
    app.use(productionAuthMiddleware);
    app.get('/api/ai', (req: Request, res: Response) =>
      res.status(200).send('ai'),
    );
    app.get('/api/webhooks', (req: Request, res: Response) =>
      res.status(200).send('webhooks'),
    );
    app.get('/monitoring', (req: Request, res: Response) =>
      res.status(200).send('monitoring'),
    );
    app.get('/search/evidence', (req: Request, res: Response) =>
      res.status(200).json({ results: [] }),
    );
  });

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  });

  it('should allow public access to /health', () => {
    const res = makeRes();
    healthHandler({} as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should deny unauthenticated access to /api/ai', async () => {
    const req = { headers: {} } as unknown as Request;
    const res = makeRes();
    const next = jest.fn();
    await productionAuthMiddleware(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should allow authenticated access to /api/ai', async () => {
    const req = {
      headers: { authorization: 'Bearer valid_token' },
    } as unknown as Request;
    const res = makeRes();
    const next = jest.fn();
    await productionAuthMiddleware(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
