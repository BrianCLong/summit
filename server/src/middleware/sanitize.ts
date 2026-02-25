import type { Request, Response, NextFunction } from 'express';
import { SanitizationUtils } from '../validation/index.js';

const sanitizePayload = (payload: unknown): unknown => {
  return SanitizationUtils.sanitizeUserInput(payload as any);
};

export default function sanitizeRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.body = sanitizePayload(req.body) as any;
  req.query = sanitizePayload(req.query) as any;
  req.params = sanitizePayload(req.params) as any;
  next();
}
