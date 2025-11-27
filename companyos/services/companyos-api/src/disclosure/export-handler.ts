import type { Request, Response } from "express";
import { trackEvent } from "../telemetry/events";

export function exportDisclosurePackHandler(req: Request, res: Response) {
  const pack = (req as any).disclosurePack?.raw_json;
  if (!pack) {
    return res.status(500).json({ error: "export_state_missing" });
  }

  trackEvent(req, "disclosure_pack_exported", {
    pack_id: pack.id,
    environment: pack.environment,
    residency_region: pack.residency_region ?? "us"
  });

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="disclosure-${pack.id}.json"`
  );
  return res.status(200).send(pack);
}
