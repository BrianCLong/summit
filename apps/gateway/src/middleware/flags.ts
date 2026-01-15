import { Request, Response, NextFunction } from "express";
import { FlagClient, FlagContext } from "@intelgraph/flags/index";

const client = new FlagClient({ env: process.env.NODE_ENV ?? "dev" });
const policyFlag = client.catalogKey("feature.policy-guard");

export interface RequestWithFlags extends Request {
  flagContext?: FlagContext;
  flags?: Record<string, unknown>;
}

export function attachFlagContext(req: RequestWithFlags, _res: Response, next: NextFunction): void {
  req.flagContext = {
    env: process.env.NODE_ENV ?? "dev",
    tenant: req.header("x-tenant-id") ?? req.query.tenant?.toString(),
    userId: (req as any).user?.id,
    userRole: (req as any).user?.roles?.[0],
    region: req.header("x-region"),
    canaryWeight: Number(req.header("x-canary-weight") ?? 0),
  };
  next();
}

export async function attachFlagHeaders(req: RequestWithFlags, res: Response, next: NextFunction): Promise<void> {
  const ctx = req.flagContext ?? { env: process.env.NODE_ENV ?? "dev" };
  const enabled = await client.get<boolean>(policyFlag, false, ctx);
  req.flags = { [policyFlag]: enabled };
  res.setHeader("x-feature-flags", JSON.stringify(req.flags));
  next();
}
