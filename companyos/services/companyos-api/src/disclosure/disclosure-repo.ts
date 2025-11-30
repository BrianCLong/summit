import type { Request, Response } from "express";
import { pool } from "../db";

export interface DisclosurePackRecord {
  id: string;
  tenant_id: string;
  product: string;
  environment: string;
  build_id: string | null;
  generated_at: string;
  generated_by: string | null;
  sbom_uri: string | null;
  vuln_critical: number;
  vuln_high: number;
  vuln_medium: number;
  vuln_low: number;
  slo_period: string | null;
  slo_availability_target: number | null;
  slo_availability_actual: number | null;
  slo_latency_target_ms_p95: number | null;
  slo_latency_actual_ms_p95: number | null;
  residency_region: string | null;
  raw_json: any;
}

export async function upsertDisclosurePackFromJson(
  pack: any
): Promise<void> {
  const {
    id,
    tenant_id,
    product,
    environment,
    generated_at,
    generated_by,
    builds,
    slo_summary,
    residency_region
  } = pack;

  const build = (builds && builds[0]) || {};
  const vuln = build.vuln_summary || {};

  const region = residency_region ?? "us";
  const packWithRegion = { ...pack, residency_region: region };

  const query = `
    INSERT INTO disclosure_packs (
      id,
      tenant_id,
      product,
      environment,
      build_id,
      generated_at,
      generated_by,
      sbom_uri,
      vuln_critical,
      vuln_high,
      vuln_medium,
      vuln_low,
      slo_period,
      slo_availability_target,
      slo_availability_actual,
      slo_latency_target_ms_p95,
      slo_latency_actual_ms_p95,
      residency_region,
      raw_json
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
    )
    ON CONFLICT (id) DO UPDATE SET
      product = EXCLUDED.product,
      environment = EXCLUDED.environment,
      build_id = EXCLUDED.build_id,
      generated_at = EXCLUDED.generated_at,
      generated_by = EXCLUDED.generated_by,
      sbom_uri = EXCLUDED.sbom_uri,
      vuln_critical = EXCLUDED.vuln_critical,
      vuln_high = EXCLUDED.vuln_high,
      vuln_medium = EXCLUDED.vuln_medium,
      vuln_low = EXCLUDED.vuln_low,
      slo_period = EXCLUDED.slo_period,
      slo_availability_target = EXCLUDED.slo_availability_target,
      slo_availability_actual = EXCLUDED.slo_availability_actual,
      slo_latency_target_ms_p95 = EXCLUDED.slo_latency_target_ms_p95,
      slo_latency_actual_ms_p95 = EXCLUDED.slo_latency_actual_ms_p95,
      residency_region = EXCLUDED.residency_region,
      raw_json = EXCLUDED.raw_json
  `;

  await pool.query(query, [
    id,
    tenant_id,
    product,
    environment,
    build.build_id,
    generated_at,
    generated_by,
    build.sbom_uri,
    vuln.critical ?? 0,
    vuln.high ?? 0,
    vuln.medium ?? 0,
    vuln.low ?? 0,
    slo_summary?.period ?? null,
    slo_summary?.availability_target ?? null,
    slo_summary?.availability_actual ?? null,
    slo_summary?.latency_target_ms_p95 ?? null,
    slo_summary?.latency_actual_ms_p95 ?? null,
    region,
    packWithRegion
  ]);
}

export async function getDisclosurePackById(
  id: string,
  tenantId: string
): Promise<DisclosurePackRecord | null> {
  const { rows } = await pool.query<DisclosurePackRecord>(
    `SELECT * FROM disclosure_packs WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [id, tenantId]
  );

  return rows[0] ?? null;
}

export async function listDisclosurePacks(
  tenantId: string
): Promise<DisclosurePackRecord[]> {
  const { rows } = await pool.query<DisclosurePackRecord>(
    `SELECT * FROM disclosure_packs WHERE tenant_id = $1 ORDER BY generated_at DESC`,
    [tenantId]
  );

  return rows;
}

export async function listDisclosurePacksHandler(req: Request, res: Response) {
  if (!req.subject) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  const packs = await listDisclosurePacks(req.subject.tenant_id);

  return res.json({
    items: packs.map((p) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      product: p.product,
      environment: p.environment,
      build_id: p.build_id,
      generated_at: p.generated_at,
      residency_region: p.residency_region ?? "us",
      vuln_summary: {
        critical: p.vuln_critical,
        high: p.vuln_high,
        medium: p.vuln_medium,
        low: p.vuln_low
      }
    }))
  });
}
