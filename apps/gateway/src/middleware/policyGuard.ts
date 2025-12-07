import { Request, Response, NextFunction } from "express";

const FEATURE_FLAG = "FEATURE_LAC_ENFORCE";

export function policyGuard(req: Request, res: Response, next: NextFunction) {
  if (process.env[FEATURE_FLAG] !== "true") {
    return next();
  }

  // Stubbed enforcement path; downstream integration with policy-compiler will replace this.
  res.setHeader("x-policy-guard", "enabled");
  return next();
}
