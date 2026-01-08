# Price-Aware Orchestration Runbook

**What it is / Why it exists:** Operational guide for the price-aware orchestration (PAO) path that refreshes pool pricing, selects pools with residency/tenant filters, and manages capacity reservations to minimize effective cost while preserving SLOs.

**Owners:** SRE + Conductor platform

**Status:** v2.1.0-alpha2 change window (2025-12-01 → 2025-12-12)

---

## Key Endpoints

- **Refresh pricing:** `POST /api/pools/pricing/refresh` (internal/authenticated; triggers fetch and upsert into `pool_pricing`).
- **List pricing status:** `GET /api/pools/pricing/status` (returns last_success_timestamp, source, rows, stale flag).
- **Reserve capacity:** `POST /api/pools/capacity/reserve` (body: `poolId`, `tenantId`, `units`, `ttl`).
- **Release capacity:** `POST /api/pools/capacity/release` (body: `reservationId` or `poolId` + `tenantId`).
- **List reservations:** `GET /api/pools/capacity/status` (active reservations, expirations, stuck flags).
- **Selector probe:** `GET /api/pools/select?cpuSec=X&gbSec=Y&egressGb=Z&residency=us` (dry-run selection with pricing applied).

> Endpoint names follow current Conductor conventions; if not yet live, treat as stubs and align the contract when the service lands.

## Golden Signals

- `pao_pricing_refresh_success_total` vs `pao_pricing_refresh_errors_total` (rate and ratio).
- `pao_pricing_last_success_timestamp_seconds` (staleness).
- `pao_pool_selection_total{pool_id}` (distribution by pool).
- `pao_unknown_pool_selections_total` (should be ~0).
- `pao_selector_no_eligible_total` (null/none outcomes).
- `pao_reservation_actions_total{action}` (reserve/release success vs error).
- `pao_active_reservations` (gauge).

## Common Incidents & Actions

### Pricing refresh failing (auth, parse, DB errors)

1. Check Grafana panel “Pricing refresh success vs error” and alert annotations.
2. Inspect Conductor logs for correlation ID on failed refresh.
3. Manually trigger `POST /api/pools/pricing/refresh` with service account token.
4. If DB write errors persist: switch refresh into cache-only mode (set feature flag `PAO_REFRESH_DISABLE_PERSIST=true`) and open a ticket for DB health.

### Stale pricing (no refresh for N minutes)

1. Validate `pao_pricing_last_success_timestamp_seconds` < 30m.
2. If stale, run manual refresh; verify Postgres `pool_pricing` rows updated.
3. If upstream API unreachable, freeze last-good cache and enable alert suppression window; plan backoff retries.

### Pool selection returning “none” / “unknown”

1. Check `pao_selector_no_eligible_total` and `pao_unknown_pool_selections_total`.
2. Confirm residency filter in request; relax residency/labels if policy allows.
3. Ensure `pool_pricing` has entries for all `pool_registry` IDs; reseed from `db/seeds/pool_pricing_v1.sql` if missing.

### Residency filter causing no eligible pools

1. Compare request residency to `pool_registry.region` values.
2. If misaligned, add matching regional label or adjust request filter (with approval).
3. If policy forbids override, route via baseline selector (see Degraded Mode).

### Capacity reservations stuck active / not released

1. List reservations via `GET /api/pools/capacity/status`; note `expiresAt`.
2. Manually release via `POST /api/pools/capacity/release`.
3. If repeated, reduce reservation TTL defaults; review worker heartbeats emitting release events.

## Degraded Mode (disable price-aware behavior)

- Set feature flag/env: `PAO_ENABLED=false` to bypass price weighting and use baseline (least-loaded) selector.
- Optional: `PAO_REFRESH_DISABLE_PERSIST=true` to halt DB upserts while leaving cache intact.
- Restart Conductor API after toggles. Confirm alerts: PricingRefreshStale expected; selection distribution should stabilize.

## Backout Plan

1. Seed pricing: run DB seed `db/seeds/pool_pricing_v1.sql` (or restore backup) to revert to baseline values.
2. Disable price-aware selectors: `PAO_ENABLED=false`, restart Conductor API.
3. Drop/ignore capacity reservations table if newly introduced; purge in-memory reservation ledger.
4. Validate baseline selection via selector probe and metrics (unknown pool selections = 0).

## Verification Checklist After Deploy

- [ ] Trigger `POST /api/pools/pricing/refresh`; verify 200 OK.
- [ ] Confirm `pool_pricing` rows updated (rows > 0, timestamps advance).
- [ ] Run selector probe; expected pool matches residency + lowest price.
- [ ] Metrics: refresh success counter increments; stale alert clears.
- [ ] Dashboard panels show non-zero selection distribution; unknown pool stat is 0.
