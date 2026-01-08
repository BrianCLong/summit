# MVP-3 → GA • Multi-Agent Orchestration Prompt (v2 — Operational)

> Paste verbatim into your agent runner. Replace `{{…}}`. All agents must emit **OTEL spans**, **structured logs**, and **signed artifacts**. Promotion is **policy-gated**; rollback is **hands-free**.

## Mission

Ship **MVP-3 GA** with progressive delivery, hard gates (SLO/SBOM/migrations/perf), auditable evidence, and reversible changes across **dev → stage → prod** (PR previews on each PR).

## Global Guardrails (apply to every agent)

- **Observability-first:** OTEL traces + Prom metrics + JSON logs with `release`, `env`, `tenant`, `trace_id`.
- **Supply chain:** SBOM (SPDX), SLSA provenance, cosign signatures; **verify at deploy**, not just build.
- **Security & data:** OPA RBAC/ABAC; WebAuthn step-up + Reason-for-Access for elevated actions; secrets via **SOPS + Sealed-Secrets**.
- **Delivery:** Canary 10→50→100 with **auto-rollback**; migration expand/contract with **shadow reads & dual-write**.
- **Evidence:** Immutable audit; retain artifacts ≥ 1y.

## Inputs

```
REPO={{REPO_NAME or summit-2025.09.23.1710}}
TARGET_VERSION={{v3.0.0}}
WINDOW={{UTC window}}
ONCALL={{@sre/@platform handles}}
TEST_TENANTS={{t-stage-1,t-stage-2}}
BUDGETS.preview_day_usd={{3}}
BUDGETS.max_runtime_image_mb={{service:MB,...}}
OIDC_ISSUER={{...}}  SCIM_BASEURL={{...}}  GA_FLAGS={{search,realtime,reports}}
```

## Required Outputs

- `artifacts/release/{{TARGET_VERSION}}/evidence.zip` (signed)
- `release_notes/{{TARGET_VERSION}}.md` (semver, changes, risks, rollback)
- Green dashboards (SLO, perf headroom, supply chain, DR freshness)
- GA flags flipped w/ audit: `{{GA_FLAGS}}.enabled=true`
- +24h KPI delta report & auto file regressions

---

## Agent Roster (RACI & APIs)

Each agent must implement the **Agent RPC**:

```
REQUEST:
{ "phase":"P#", "op":"PLAN|APPLY|VERIFY|ROLLBACK",
  "scope":{ "env":"dev|stage|prod", "services":[...], "tenants":[...] },
  "inputs":{...}, "trace_id":"…" }

RESPONSE:
{ "phase":"P#", "agent":"<name>", "result":"ok|fail",
  "artifacts":[{"path":"…","sha256":"…","sig":"…"}],
  "links":{"prs":[],"dashboards":[],"runs":[]},
  "notes":"…", "next":"…", "trace_id":"…" }
```

**A1 Release Conductor (Chair/Owner)**

- Orchestrates phases, verifies gates, promotes/rolls back, packages evidence.

**A2 CI/CD Engineer (R)**

- Owns workflows, required checks, preview TTL/budgets.

**A3 Platform/DevOps (R)**

- Helm/Terraform, security contexts, HPA/VPA/KEDA, pgBouncer, netpols.

**A4 Observability Lead (R)**

- Golden paths (catalog + probes), SLO burn rules, dashboards.

**A5 Supply Chain (R)**

- SBOM, provenance, signing, vuln diff budgets, policy-as-code.

**A6 Schema/Migrations (R)**

- Migration gate, shadow reads/dual-write, backfill, rollback.

**A7 Data Plane (R)**

- Postgres/Neo4j/Redis/Typesense readiness, index hygiene, RLS.

**A8 Flags & Rollout (R)**

- Typed SDKs, catalog, kill-switch, auto-ramp tied to canary.

**A9 AuthZ/Compliance (A/R)**

- OPA RBAC/ABAC, obligations (step-up/RFA), decision logging.

**A10 DR/BCP (R)**

- Cross-region backups, failover/cutback drills.

**A11 Performance (R)**

- k6 models, perf gates, headroom/predictor, HPA tuning.

**A12 Realtime (R)**

- WS/SSE fanout, ordered per tenant, resume from checkpoint.

**A13 Reporting/PDF (R)**

- Playwright renderer, redaction, signing/provenance.

**A14 Search/Typesense (R)**

- Schemas, indexer, alias reindex, relevance tuning.

**A15 Ingest/ETL (R)**

- Backpressure, DLQ, replayctl, exactly-once-effect.

**A16 Chaos Captain (R)**

- Stage chaos + canary rollback drills.

**A17 Runbook/Alert Arborist (R)**

- Alert catalog→PrometheusRules; runbooks; noise reduction.

(Conductor is **Accountable**; others Responsible; Security/Compliance **Consulted** across.)

---

## Phases & Gates (with DONE criteria)

**P0 Readiness (A2, A3, A5)**

- Required checks wired (`slo-gates`, `migration-gate`, `supply-chain`, `performance-gate`, `policy-ci`).
- Containers hardened (non-root, read-only FS), size budgets enforced.
- **Gate:** All checks green on two demo PRs; image sign/verify passes.

**P1 Baselines (A4, A2, A11)**

- `golden_paths.yaml` live; probes running in previews/stage; perf baseline & headroom ≥20%.
- **Gate:** SLO gates + performance gate passing; preview TTL/budgets enforced.

**P2 Data Safety (A6, A7)**

- Migration dry-runs + shadow parity; dual-write flags; pgBouncer; RLS/tenant guards; index catalog.
- **Gate:** Demo Postgres+Neo4j migrations pass; 48h data budgets green.

**P3 Security/Compliance (A9, A5, A8, Identity sidecar)**

- OPA obligations (step-up/RFA) enforced; audit hash-chain; OIDC+WebAuthn; SCIM dry-run.
- **Gate:** Decision logs/identity dashboards green; exceptions time-boxed.

**P4 Product GA (A12–A15)**

- Realtime WS/SSE; Reporting deterministic + redaction; Search GA w/ alias swap; Ingest backpressure+replay.
- **Gate:** 48h SLOs green; reindex parity; ingest lag <60s.

**P5 DR/Chaos (A10, A16)**

- DR drill (RTO≤30m/RPO≤5m); chaos drills including one auto-rollback.
- **Gate:** Evidence signed; gaps filed.

**P6 Release Train (A1)**

- Cut `release/v{{X.Y.Z}}-rc.N`; stage canary; prod 10→50→100 gated; notes; evidence.zip.
- **Gate:** Tag signed + evidence uploaded; rollback drill simulated.

**P7 Alert Hygiene (A17)**

- 100% Sev1/2 alerts have owners + runbooks; noise ↓ ≥40%; drills pass.

**P8 GA Flip & KPI (+24h) (A1)**

- GA flags flipped with audit; KPI deltas posted; regressions auto-ticketed.

---

## Promotion API (Conductor → Pipeline)

```
PROMOTE REQUEST:
{ "version":"{{TARGET_VERSION}}",
  "canary":[10,50,100],
  "gates":["slo","perf","supply_chain","migrations","policy"],
  "flags_auto_ramp":true, "trace_id":"…" }
ROLLBACK TRIGGER:
{ "version":"{{TARGET_VERSION}}", "reason":"slo_breach|gate_fail", "trace_id":"…" }
```

**Promote only if**: green checks; SLO burn=0; perf headroom≥20%; migration cutover ready; DR freshness OK; SBOM/provenance signed+verified; preview hygiene OK.

---

## Evidence Bundle Schema (zip root)

```
/sbom/*.spdx.json
/attestations/*.intoto.jsonl
/signatures/*.sig
/slo/*.png  /probes/*.json
/perf/*.json  /perf/headroom.json
/migrations/plan+shadow_parity.json
/dr/drill_{date}/results.json
/chaos/{id}/evidence.json
/release_notes.md
/approvals_matrix.json
/alerts/hygiene_report.json
/audit/highlights.jsonl
/_manifest.json  (hashes of all entries)
```

---

## Comm Templates (Conductor posts)

**Release start:**
“Cutting `{{TARGET_VERSION}}` — stage canary starting. Gates: SLO/Perf/SupplyChain/Migrations/Policy. Evidence will attach on promote. On-call: {{ONCALL}}.”

**Auto-rollback:**
“Canary breach at **{{step}}%** — auto-rollback triggered. Cause: {{gate}}. Evidence + traces attached. Investigating.”

**GA:**
“`{{TARGET_VERSION}}` promoted to 100%. GA flags flipped: {{GA_FLAGS}}. Evidence bundle attached; +24h KPI compare scheduled.”

---

## One-Click Kickoff (Conductor sends in order)

1. **P0** → A2: PLAN+APPLY `required_checks` & branch protections; attach export.

2. **P0** → A5: APPLY `supply-chain-gates`; show verify-at-deploy proof.

3. **P0** → A3: APPLY container hardening + budgets; return size trend.

4. **P1** → A4: APPLY `golden_paths` + probes (preview/stage); return dashboards.

5. **P1** → A11: RUN baseline k6; return headroom & thresholds.

6. **P2** → A6: RUN migration gate demos (pg+neo4j); attach plan+parity+rollback.

7. **P2** → A7: APPLY pgBouncer, RLS, index catalog; return advisor schedule.

8. **P3** → A9: APPLY OPA obligations; step-up + RFA enforced w/ logs.

9. **P3** → Identity: OIDC+WebAuthn+SCIM smoke; attach metrics.

10. **P4** → A12–A15: APPLY feature GA tracks; return SLO+parity+lag.

11. **P5** → A10: RUN DR drill; evidence.

12. **P5** → A16: RUN chaos rollback drill; evidence.

13. **P6** → A1: RUN `release-train` → `promote`; attach signed evidence; flip GA flags.

14. **P8** → A1: RUN +24h KPI; open regressions.

---

## Stop Conditions

- Any **critical** (security, data integrity, SLO burn) → **HALT**, auto-rollback, open incident with runbook link, evidence capture, exec notify.

---

## Parallelization Hints

- P0/P1 can run in parallel with A5 vs A3 vs A4.
- P4 product tracks (Realtime/Search/Reporting/Ingest) can run concurrently once P1–P3 gates are green.
- P5 drills must happen after P4 stable for 48h in stage.

---

## Simulation Mode (dry-run)

All agents support `SIMULATE=true` to emit artifacts w/o mutating infra, enabling tabletop exercises.

---

**End — v2 orchestration prompt.**
