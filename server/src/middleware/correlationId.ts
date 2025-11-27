import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export const correlationStorage = new AsyncLocalStorage<{ correlationId: string }>();

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

  // Set the header on the response so the client sees it too
  res.setHeader('x-correlation-id', correlationId);

  correlationStorage.run({ correlationId }, () => {
    next();
  });
};

export const getCorrelationId = (): string | undefined => {
  const store = correlationStorage.getStore();
  return store?.correlationId;
};
