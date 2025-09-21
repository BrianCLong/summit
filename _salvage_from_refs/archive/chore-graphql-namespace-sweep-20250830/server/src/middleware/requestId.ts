import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).reqId = req.headers["x-request-id"] || randomUUID();
    res.setHeader("x-request-id", (req as any).reqId);
    next();
  };
}
