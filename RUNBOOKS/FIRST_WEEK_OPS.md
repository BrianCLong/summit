# Summit First-Week Operations Runbook

**Applies to:** Every Summit release going into live traffic.
**Owner:** On-call engineer + release captain.
**Last updated:** 2026-03-09.

---

## Overview

This runbook covers the seven days following a Summit deployment. It defines
what to check, when to check it, what healthy looks like, and what actions to
take at each signal level. Nothing in here requires guesswork — every step has
a defined trigger and a defined action.

**Decision ladder:**

| Signal level | Label | Default action |
|---|---|---|
| Within expected baseline | **Monitor** | Observe; no action required |
| Elevated but not threshold-breaking | **Investigate** | Identify root cause within 30 min |
| Threshold exceeded | **Rollback / disable** | Act immediately; escalate if needed |

---

## Launch Day (Day 0)

### Pre-traffic checklist

Run before enabling live traffic. All items must be green.

```bash
# 1. Run post-deploy validation script
BASE_URL=https://summit.example.com node scripts/post-deploy/validate.mjs --verbose

# 2. Verify telemetry ingest is receiving events
# Expected: app_opened events appear within 60s of first user session

# 3. Confirm feature flags are resolving correctly
# GET /api/feature-flags/evaluate with a test context → inspect variant assignments

# 4. Verify error boundaries are in place on all critical routes
# Check ErrorBoundary wrappers exist in App.tsx for: /, /explore, /analyst, /alerts, /cases

# 5. Confirm OTEL collector is running (if deployed)
curl http://otel-collector:4318/v1/traces -XPOST -H 'Content-Type: application/json' -d '{"resourceSpans":[]}' -s -o /dev/null -w '%{http_code}'
# Expected: 200 or 204
```

### Post-traffic-enable (first 30 minutes)

Watch for these signals immediately after enabling traffic:

| Metric | Healthy | Investigate | Rollback Now |
|---|---|---|---|
| `app_opened` events/min | >0 (baseline traffic) | Zero for >5 min | Zero + `app_boot_failed` spike |
| HTTP 5xx rate (API) | <1 % | 1–5 % | >5 % |
| `fatal_error_boundary_triggered` | 0 | 1–3 isolated | >5 in 5 min |
| `app_boot_failed` | 0 | 1 isolated | >2 |
| GraphQL error rate | <2 % | 2–10 % | >10 % |

---

## Daily Smoke Check (Days 1–7)

Run every morning within 30 minutes of shift start.

```bash
# Post-deploy validator (takes <30 s)
BASE_URL=https://summit.example.com node scripts/post-deploy/validate.mjs

# Check telemetry volume is non-zero
# Query: count(event="app_opened") in last 24h > 0

# Check error boundary fatals
# Query: count(event="fatal_error_boundary_triggered") in last 24h
```

Expected daily outcomes:
- Validator: 10/10 checks passing.
- `app_opened` count: within ±30 % of prior day.
- `fatal_error_boundary_triggered`: 0 or same as prior day baseline.

---

## Metrics to Review Each Day

### Adoption health

| Metric | Query | Healthy baseline |
|---|---|---|
| Daily app opens | `count(event="app_opened")` per day | Growing or stable |
| Analyst workspace opens | `count(event="analyst_workspace_opened")` per day | >20 % of app opens |
| Entity selections | `count(event="entity_selected")` per session | >3 per workspace session |
| Report previews | `count(event="report_preview_opened")` per day | Non-zero |

### Performance health

| Metric | Query | Threshold to investigate |
|---|---|---|
| Slow workspace opens | `count(event="analyst_workspace_opened", latency_bucket=">5s")` / total | >5 % |
| Slow route loads | `count(event="route_loaded", latency_bucket=">5s")` / total | >3 % |
| Slow pane queries | `count(event="tri_pane_query_latency", latency_bucket=">5s")` | >5 % per pane |

### Error health

| Metric | Query | Threshold |
|---|---|---|
| Fatal boundary rate | `count(event="fatal_error_boundary_triggered")` / hr | >5 in 5 min → rollback |
| Recoverable errors | `count(event="recoverable_error_shown")` / hr | 2× prior day → investigate |
| API 5xx rate | Server logs / APM | >2 % → investigate, >5 % → rollback |
| Boot failures | `count(event="app_boot_failed")` | Any → investigate immediately |

### Plugin / sandbox health

| Metric | Query | Threshold |
|---|---|---|
| Plugin load failure rate | `count(event="plugin_load_failed")` / (`plugin_loaded` + `plugin_load_failed`) | >10 % → disable plugin |
| Sandbox init failures | `count(event="sandbox_init_failed")` | Any spike → escalate |

### i18n health

| Metric | Query | Threshold |
|---|---|---|
| Fallback rate | `count(event="i18n_fallback_triggered")` / sessions with language | >1 % → missing bundle |
| Language switch errors | Absence of `language_changed` after user UI action | Report as bug |

---

## Known-Risk Watchlist (First Week)

These areas carry elevated first-week risk and should be checked daily:

1. **Tri-pane entity sync** — `tri_pane_sync_divergence` events should be zero. Any sustained occurrence means pane state has drifted; reload the workspace to confirm, file a P1 if reproducible.

2. **Lazy chunk loading** — Large JS bundles fetched on first route visit may fail under slow connections. Watch `route_loaded` latency distribution. If `>5s` climbs, check CDN cache hit rate.

3. **Feature flag evaluation** — `feature_flag_path_used` events confirm flags are resolving. If a flag disappears from the event stream for a variant you expect to be live, the flag targeting may have regressed.

4. **Error boundary retry exhaustion** — `fatal_error_boundary_triggered` with `retryCount >= maxRetries` means a user hit a non-recoverable state. Any named boundary with >5 events in an hour needs a hotfix investigation.

5. **OTEL collector backpressure** — If the OTEL collector falls behind, spans will be dropped. Watch for gaps in trace coverage. This is a monitor-only risk unless spans drop to zero.

---

## Incident Triage Sequence

When a threshold is breached, follow these steps in order:

### Step 1: Classify (< 5 min)

```
Is the app loading at all? (check app_opened events)
  Yes → classify as degraded
  No  → classify as outage → go to Step 4 immediately
```

### Step 2: Scope (< 10 min)

- Which routes / boundaries are affected? (`route` label on error events)
- Which feature flag variants are in scope? (`feature_flag_path_used`)
- Is it correlated to a specific entity type or plugin? (`entity_type`, `plugin_id`)
- Is it happening on all devices / sessions or a subset?

### Step 3: Triage decision

| Symptom | Action |
|---|---|
| Single boundary failing for a specific route | Disable route via feature flag if one exists; otherwise hotfix |
| Multiple boundaries failing across routes | Consider partial rollback of last deploy |
| `app_boot_failed` > 0 | Immediate rollback consideration |
| Plugin failure spike | Disable the specific plugin via kill switch |
| i18n fallback spike | Redeploy translation bundle; no app rollback needed |
| API 5xx spike only | Investigate backend; frontend may be healthy |

### Step 4: Rollback triggers (act immediately)

Rollback or disable-feature-now criteria:

- `app_boot_failed` ≥ 2 events in 15 min
- `fatal_error_boundary_triggered` ≥ 5 events in 5 min on root boundary
- API health check returns 5xx for >2 consecutive minutes
- GraphQL schema fails to resolve root type
- Post-deploy validator fails 3+ checks
- `app_opened` count drops to zero for >10 minutes during known traffic hours

### Step 5: Rollback execution

```bash
# Option A: Feature kill switch (preferred if flag-controlled)
# Set the relevant VITE_* env var to 'false' and redeploy the frontend

# Option B: Redeploy prior release
git tag -l "release/*" | tail -5   # find the last good release tag
# Trigger your CD pipeline with the prior release tag

# Option C: Disable a specific plugin
# Update plugin manifest to mark plugin as disabled; redeploy config

# Option D: Emergency static maintenance page
# Route all traffic to a static maintenance page via CDN/LB rule
```

---

## Degraded-Mode Actions

If full rollback is not viable, these degraded-mode options reduce blast radius:

| Scenario | Degraded action |
|---|---|
| Tri-pane desync | Disable `VITE_ENHANCED_TRI_PANE_ENABLED=false`; users fall back to basic explore |
| Explain View crash loop | Disable `VITE_EXPLAIN_VIEW_ENABLED=false` |
| Maestro failures | Disable `VITE_MAESTRO_ENABLED=false` |
| Plugin instability | Remove plugin from manifest; redeploy config only |
| i18n missing bundle | Force default locale; disable language switcher via flag |
| Demo mode issues | Remove `VITE_DEMO_MODE_ENABLED` from env; restores live mode |

---

## Escalation Path

| Situation | Escalate to |
|---|---|
| App boot failure in production | Release captain + on-call engineer immediately |
| Fatal boundary rate sustained | Release captain for rollback decision |
| API / GraphQL down | Backend on-call |
| OTEL / telemetry blind spot | Platform/ops team |
| Data integrity concern (entity sync) | Data team + release captain |

---

## Day 7 Readiness Checklist

At end of first week, confirm:

- [ ] Post-deploy validator passes 10/10 on all environments
- [ ] `app_opened` trend is stable or growing
- [ ] No `app_boot_failed` events in last 48 hours
- [ ] Fatal boundary rate below 1 per hour
- [ ] All feature flags behaving as targeted (verified via `feature_flag_path_used`)
- [ ] Plugin load failure rate < 5 %
- [ ] No i18n fallback rate > 0.5 %
- [ ] Tri-pane sync divergence events = 0 in last 48 hours
- [ ] Telemetry coverage confirmed for all critical workflows
- [ ] Runbook reviewed and updated with any first-week learnings

If all checked: **proceed to steady-state monitoring**. Hand off to standard SLO/SLA tracking.

---

## References

- Post-deploy validation script: `scripts/post-deploy/validate.mjs`
- Telemetry event catalog: `docs/TELEMETRY_CATALOG.md`
- Error boundary implementation: `apps/web/src/components/error/ErrorBoundary.tsx`
- Adoption events: `apps/web/src/telemetry/events.ts`
- Feature flag config: `apps/web/src/lib/flags.ts` and `apps/web/src/contexts/FeatureFlagContext.tsx`
- Existing runbooks: `RUNBOOKS/GA_LAUNCH_INTEGRATION_STABILIZATION_PLAYBOOK.md`
