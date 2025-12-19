import { Request, Response, NextFunction } from "express";
import { FlagClient } from "../../../../libs/flags/node";

const client = new FlagClient({ env: process.env.NODE_ENV ?? "dev" });
const featureKey = client.catalogKey("feature.policy-guard");

export async function policyGuard(req: Request, res: Response, next: NextFunction) {
  const enabled = await client.get<boolean>(featureKey, false, {
    env: process.env.NODE_ENV ?? "dev",
    tenant: req.header("x-tenant-id") ?? req.query.tenant?.toString(),
    userId: (req as any).user?.id,
    userRole: (req as any).user?.roles?.[0],
  });

  if (!enabled) {
    return next();
  }

  res.setHeader("x-policy-guard", "enabled");
  return next();
}
