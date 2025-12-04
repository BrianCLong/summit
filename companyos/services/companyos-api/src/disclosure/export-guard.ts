import type { Request, Response, NextFunction } from "express";
import { getDisclosurePackById } from "./disclosure-repo";
import { evaluateDisclosureExport } from "../authz/opa-disclosure";
import type { Resource } from "../authz/types";
import { trackEvent } from "../telemetry/events";

export async function disclosureExportGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.subject) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  const { id } = req.params;
  const pack = await getDisclosurePackById(id, req.subject.tenant_id);
  if (!pack) {
    return res.status(404).json({ error: "not_found" });
  }

  const resource: Resource = {
    type: "disclosure_pack",
    id: pack.id,
    tenant_id: pack.tenant_id,
    residency_region: pack.residency_region ?? "us"
  };

  const input = {
    subject: req.subject,
    resource,
    action: "disclosure:export"
  };

  try {
    const decision = await evaluateDisclosureExport(input);

    trackEvent(req, "disclosure_pack_export_attempt", {
      pack_id: pack.id,
      residency_region: resource.residency_region,
      decision: decision.allow,
      reason: decision.reason
    });

    if (!decision.allow) {
      return res.status(403).json({
        error: "forbidden",
        reason: decision.reason ?? "policy_denied"
      });
    }

    (req as any).disclosurePack = pack;
    return next();
  } catch (err) {
    (req as any).log?.error?.({ err }, "authz_disclosure_export_error");
    return res.status(503).json({ error: "authorization_unavailable" });
  }
}
