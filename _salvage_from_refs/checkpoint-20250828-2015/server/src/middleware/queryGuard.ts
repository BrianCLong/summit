import type { Request, Response, NextFunction } from "express";

const MAX_COMPLEXITY = 2000; // tune per pilot
const MAX_MS = 1500;

export function queryGuard(req: Request, res: Response, next: NextFunction) {
  const complexity = Number(req.headers["x-gql-complexity"] ?? 0);
  if (complexity > MAX_COMPLEXITY) return res.status(429).json({ error: "Query too complex" });

  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    if (ms > MAX_MS) {
      console.warn("slow-query", { path: req.path, ms, complexity });
    }
  });
  next();
}
