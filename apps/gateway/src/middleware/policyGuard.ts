import { Request, Response, NextFunction } from "express";

export function policyGuard(req: Request, res: Response, next: NextFunction) {
  void req;
  void res;
  next();
}
