import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function auth(required = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.headers.authorization?.replace(/^Bearer /, "") ||
      (req.query.token as string | undefined);

    if (!token && !required) return next();
    if (!token) return res.status(401).json({ error: "missing token" });

    try {
      (req as any).user = jwt.verify(token, process.env.JWT_PUBLIC_KEY!, {
        algorithms: ["RS256"],
      });
      next();
    } catch {
      res.status(401).json({ error: "invalid token" });
    }
  };
}