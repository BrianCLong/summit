import { Request, Response, NextFunction } from "express";

<<<<<<< HEAD
export function policyGuard(req: Request, res: Response, next: NextFunction) {
  void req;
  void res;
  next();
=======
const FEATURE_FLAG = "FEATURE_LAC_ENFORCE";

export function policyGuard(req: Request, res: Response, next: NextFunction) {
  if (process.env[FEATURE_FLAG] !== "true") {
    return next();
  }

  // Stubbed enforcement path; downstream integration with policy-compiler will replace this.
  res.setHeader("x-policy-guard", "enabled");
  return next();
>>>>>>> 76edd5fd48 (feat: seed service acceleration pack)
}
