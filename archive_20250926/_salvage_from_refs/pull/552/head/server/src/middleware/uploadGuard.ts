import { Request, Response, NextFunction } from 'express';
import { precheckAndRoute } from '../services/MediaPrecheckService';

export async function uploadGuard(req: Request, res: Response, next: NextFunction) {
  const filePath = (req as any).filePath;
  const mime = (req as any).mime || 'application/octet-stream';
  if (!filePath) return next();
  const result = await precheckAndRoute(filePath, mime);
  (req as any).detector = result.detector;
  if (result.quarantined) {
    res.status(202).json({ message: 'quarantined', flags: result.flags });
    return;
  }
  next();
}
