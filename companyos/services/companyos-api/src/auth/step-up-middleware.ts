import { Request, Response, NextFunction } from "express";

export function requireStepUp(req: Request, res: Response, next: NextFunction) {
  const subject = req.subject;
  if (!subject) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  if (!subject.attributes.mfa_verified) {
    return res.status(403).json({
      error: "step-up-required",
      message: "This action requires multi-factor authentication.",
    });
  }

  next();
}
