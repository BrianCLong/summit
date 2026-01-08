import { randomUUID, createHash } from "crypto";
import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

interface AuthzInput {
  subject: {
    id: string;
    roles: string[];
    tenant?: string;
    clearance: string;
    mfa?: string;
  };
  resource: {
    type: string;
    id: string;
    tenant: string;
    classification: string;
  };
  action: string;
  context: {
    env: string;
    request_ip: string;
    time: string;
    reason?: string;
    risk: string;
    warrant_id?: string;
  };
}

interface Decision {
  allow: boolean;
  deny?: string[];
  obligations?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const DEFAULT_DECISION_URL =
  process.env.OPA_DECISION_URL || "http://localhost:8181/v1/data/policy/authz/abac/decision";

const redacted = (value?: string) =>
  value ? createHash("sha256").update(value).digest("hex").slice(0, 8) : undefined;

function buildInput(req: Request): AuthzInput {
  const roles = (req.headers["x-roles"] as string | undefined)?.split(",") || [];
  const tenantHeader =
    (req.headers["x-tenant"] as string | undefined) ||
    (req.headers["x-tenant-id"] as string | undefined) ||
    "unknown";
  const classification =
    (req.headers["x-resource-classification"] as string | undefined) || "internal";

  const reason =
    (req.headers["x-reason"] as string | undefined) ||
    (typeof req.body?.reason === "string" ? req.body.reason : undefined);

  return {
    subject: {
      id: (req.headers["x-subject-id"] as string | undefined) || "anonymous",
      roles,
      tenant: tenantHeader,
      clearance: (req.headers["x-clearance"] as string | undefined) || "internal",
      mfa: (req.headers["x-mfa"] as string | undefined) || "unknown",
    },
    resource: {
      type: req.headers["x-resource-type"]?.toString() || req.path,
      id: req.headers["x-resource-id"]?.toString() || "na",
      tenant: tenantHeader,
      classification,
    },
    action:
      (req.headers["x-action"] as string | undefined) || `${req.method.toLowerCase()}:${req.path}`,
    context: {
      env: (req.headers["x-env"] as string | undefined) || "dev",
      request_ip: req.ip || "unknown",
      time: new Date().toISOString(),
      reason,
      risk: (req.headers["x-risk"] as string | undefined) || "low",
      warrant_id: (req.headers["x-warrant-id"] as string | undefined) || undefined,
    },
  };
}

export async function authzMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/healthz") return next();

  const traceId = (req.headers["x-trace-id"] as string | undefined) || randomUUID();
  res.setHeader("x-trace-id", traceId);

  const input = buildInput(req);

  try {
    const response = await fetch(DEFAULT_DECISION_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      logger.warn("OPA decision endpoint returned non-200", {
        status: response.status,
        traceId,
      });
      return res.status(503).json({ error: "authz_unavailable", traceId });
    }

    const body = (await response.json()) as { result?: Decision };
    const decision = body.result;

    if (!decision) {
      return res.status(503).json({ error: "authz_unavailable", traceId });
    }

    const denyReasons = Array.isArray(decision.deny) ? decision.deny : [];

    logger.info("authz_decision", {
      traceId,
      subject: redacted(input.subject.id),
      roles: input.subject.roles,
      action: input.action,
      tenant: input.resource.tenant,
      decision: decision.allow ? "allow" : "deny",
      deny_reasons: denyReasons,
    });

    if (!decision.allow) {
      if (decision.obligations?.step_up_auth) {
        res.setHeader("x-step-up-required", "true");
      }
      if (denyReasons.length > 0) {
        res.setHeader("x-deny-reason", denyReasons.join(","));
      }
      return res.status(403).json({ error: "forbidden", reasons: denyReasons, traceId });
    }

    return next();
  } catch (error) {
    logger.error("authz_middleware_failure", error as Error, { traceId });
    return res.status(503).json({ error: "authz_unavailable", traceId });
  }
}
