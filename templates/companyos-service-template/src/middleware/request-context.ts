import { randomUUID } from 'crypto';
import { createNamespace } from 'cls-hooked';
import { NextFunction, Request, Response } from 'express';

const namespace = createNamespace('request');

export const bindRequestContext = (req: Request, _res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id']?.toString() || randomUUID();
  namespace.run(() => {
    namespace.set('requestId', requestId);
    next();
  });
};

export const getRequestId = () => namespace.get('requestId') as string | undefined;
