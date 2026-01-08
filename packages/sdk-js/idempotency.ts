// packages/sdk-js/idempotency.ts
import * as crypto from "crypto";
import { Request, Response, NextFunction } from "express";

const cache = new Map<string, { status: number; body: any; ts: number }>();
const TTL = 5 * 60 * 1000; // 5m

export function idempotency(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "POST") return next();
  const key = (req.headers["idempotency-key"] || "") as string;
  if (!key || key.length < 8) return res.status(400).json({ error: "missing idempotency-key" });

  const hit = cache.get(key);
  const now = Date.now();

  // Cleanup old keys
  for (const [k, v] of Array.from(cache)) {
    if (now - v.ts > TTL) cache.delete(k);
  }

  if (hit) return res.status(hit.status).json(hit.body);

  // Intercept json response
  const _json = res.json.bind(res);
  res.json = (body: any) => {
    cache.set(key, { status: res.statusCode || 200, body, ts: now });
    return _json(body);
  };
  next();
}
