import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      reqId?: string;
    }
  }
}

export function requestId(headerName = 'x-request-id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const headerValue = req.headers[headerName];
    const existingRequestId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;
    const reqId = existingRequestId || randomUUID();

    req.reqId = reqId;
    res.setHeader(headerName, reqId);
    next();
  };
}

