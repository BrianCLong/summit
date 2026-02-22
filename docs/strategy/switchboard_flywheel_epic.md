# Switchboard Flywheel Strategy Epic

## 1.7 Build plan (PR stack with non-negotiable gates)

### PR-1: Consumer wedge guardrails (policy first)

* Add `policy/dual_use_policy.md` (no harmful automation; deny-by-default)
* Add `schemas/gov/policy_graph.json`, `services/gov-policy/`
* CI gates: `policy_bypass_gate`, `deny_by_default_gate`
* Evidence: `report.json`, `metrics.json`, `stamp.json`

### PR-2: Receipts + evidence resolver (provable by default)

* Add `libs/evidence/resolve.ts|py`, `services/evidence-ledger/`
* Add `schemas/receipt.v0.1.json`, generate `citation_proof.json` for every user-visible output
* CI gates: `evidence_resolution_gate` (0 dangling), `receipt_schema_gate`

### PR-3: Sandboxed skill runtime + capability tokens

* Add `runtime/sandbox/` (container/jail) + scoped token minting
* Add `schemas/skill.manifest.v0.1.json`, `schemas/skill.permissions.v0.1.json`
* CI gates: `sandbox_escape_suite`, `capability_scope_suite`

### PR-4: Verified skill registry + signing + reproducible build checks

* Add `tools/skillpack/` (digest/sign/verify) + `services/skill-registry/`
* “Verified” requires: signature verify, sandbox suite pass, least-privilege permissions
* CI gates: `verified_skill_conformance_gate`, `supply_chain_attestation_gate`

### PR-5: Trust Dashboard + SLOs (make replacement painful)

* Add `ops/dashboards/audit_readiness.json` + synthetic canary tests
* SLOs: `auditor_verify_p95 < 20s`, `citation_resolve = 100%`, `policy_check_coverage = 100%`
* CI gate: `slo_regression_gate`

### PR-6: White-label tenancy overlays (Switchboard at Switchboard)

* Add `tenancy/` (policy overlays, branding, retention, kill-switch)
* Admin console endpoints + export bundle generator
* CI gates: `tenant_isolation_suite`, `export_bundle_repro_gate`

### PR-7: Cost Router “cheap-by-default”

* Add caching + model routing rules, budgets, “max cost per workflow” caps
* CI gates: `cost_budget_gate`, `routing_determinism_gate`

### PR-8: Enterprise bridge hooks (don’t fork)

* Add SSO/SCIM stubs, residency flags, connector interface parity
* Evidence bundles map to compliance controls (lightweight first)
* CI gates: `enterprise_parity_contract_tests`
