import type { Request, Response, NextFunction } from "express";
import { evaluateCustomerRead } from "./opa-client";
import type { Resource } from "./types";

export async function customerReadGuard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.subject) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  const resource: Resource = {
    type: "customer",
    id: req.params.id,
    tenant_id: req.params.tenantId ?? req.subject.tenant_id,
    region: req.params.region ?? req.header("x-resource-region") ?? "us",
  };

  const input = {
    subject: req.subject,
    resource,
    action: "customer:read",
  };

  try {
    const decision = await evaluateCustomerRead(input);

    (req as any).log?.info?.(
      {
        subject_id: req.subject.id,
        resource,
        action: input.action,
        decision: decision.allow,
        reason: decision.reason,
      },
      "authz_decision",
    );

    if (!decision.allow) {
      return res.status(403).json({
        error: "forbidden",
        reason: decision.reason ?? "policy_denied",
      });
    }

    return next();
  } catch (err) {
    (req as any).log?.error?.({ err }, "authz_error");
    return res.status(503).json({ error: "authorization_unavailable" });
  }
}
