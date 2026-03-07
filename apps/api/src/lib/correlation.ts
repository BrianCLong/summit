import crypto from "node:crypto";
import type { Request, Response } from "express";

export const resolveCorrelationId = (req: Request, res?: Response): string => {
  const incoming = (req.headers["x-correlation-id"] as string | undefined)?.trim() || "";
  const correlationId = incoming.length > 0 ? incoming : crypto.randomUUID();

  if (res) {
    res.setHeader("x-correlation-id", correlationId);
  }

  return correlationId;
};
