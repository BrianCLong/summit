"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisclosureRepository = void 0;
class DisclosureRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async listDisclosurePacksForTenant(tenantId, environment) {
        const query = `
      SELECT *
      FROM disclosure_packs
      WHERE tenant_id = $1
        AND ($2::text IS NULL OR environment = $2)
      ORDER BY generated_at DESC
      LIMIT 200
    `;
        const res = await this.db.query(query, [tenantId, environment ?? null]);
        return res.rows;
    }
    async getDisclosurePackById(id, tenantId) {
        const query = `
      SELECT *
      FROM disclosure_packs
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
    `;
        const res = await this.db.query(query, [id, tenantId]);
        return res.rows[0] ?? null;
    }
    async upsertDisclosurePackFromJson(pack) {
        const builds = pack.builds ?? [];
        const sloSummary = pack.slo_summary;
        const build = builds[0] ?? {};
        const vuln = build.vuln_summary ?? {};
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
        raw_json
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
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
        raw_json = EXCLUDED.raw_json
    `;
        await this.db.query(query, [
            pack.id,
            pack.tenant_id,
            pack.product,
            pack.environment,
            build.build_id,
            pack.generated_at,
            pack.generated_by,
            build.sbom_uri,
            vuln.critical ?? 0,
            vuln.high ?? 0,
            vuln.medium ?? 0,
            vuln.low ?? 0,
            sloSummary?.period ?? null,
            sloSummary?.availability_target ?? null,
            sloSummary?.availability_actual ?? null,
            sloSummary?.latency_target_ms_p95 ?? null,
            sloSummary?.latency_actual_ms_p95 ?? null,
            pack,
        ]);
    }
}
exports.DisclosureRepository = DisclosureRepository;
