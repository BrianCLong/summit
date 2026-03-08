# Switchboard Flywheel (Strategy Track)

## Summit Readiness Assertion (pre-commit)
This strategy track operates under the Summit Readiness Assertion and its non-negotiable gates. Reference: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Strategy directive
**Positioning:** Launch a consumer/SMB **Switchboard Personal Agent** plus white-label variants as a consumer wedge that compounds revenue and proof into the enterprise platform.

**Core constraint:** The consumer product is the enterprise core with fewer connectors. No toy stack.

## Grounded claims (integrated)
1. **Consumer wedge + white-label** as market-entry strategy and funding flywheel for enterprise.
2. **Differentiation:** secure, provable, traceable, governed, and cheaper-by-default.
3. **Operational moat:** receipts, policy, provenance, governed skills, sandboxing, measurable SLOs.
4. **Verified skills model** to avoid ungoverned plugin bazaar risk.
5. **Portable evidence bundles** that prove enterprise posture.

## Target outcomes (GA-ready)
1. **Switchboard Personal Agent v1:** multi-channel agent with receipts, approvals, sandboxed verified skills, and cost controls.
2. **White-label v1:** tenant branding + admin + policy overlays + audit export.
3. **Enterprise Bridge v1:** evidence artifacts and governance parity + SSO/SCIM/residency/connectors.

## Architecture additions (consumer wedge that composes into enterprise)
### Hard-to-copy operational moat modules
1. **Receipts + Replay**: append-only evidence ledger, replay simulator, undo where feasible.
2. **Policy Graph**: capability scopes, per-agent/flow RBAC, approvals, exceptions.
3. **Provenance Graph**: artifact hashes, transform lineage, model/config hashes, chain-of-custody.
4. **Verified Skills Supply Chain**: signed bundles, reproducible build attestations, sandbox tests, curated registry.
5. **Cost Router**: cheap-by-default routing, caching, budgets, alerts.
6. **Trust Dashboard**: SLOs + audit verify button + evidence resolution health.

**Evidence ID (required):**
`EVID::<tenant>::<domain>::<artifact>::<yyyy-mm-dd>::<gitsha7>::<runid8>`

## Epic plan (PR-1 → PR-8) with non-negotiable gates

### PR-1: Consumer wedge guardrails (policy first)
**Files/paths**
- `policy/dual_use_policy.md`
- `schemas/gov/policy_graph.json`
- `services/gov-policy/`

**CI gates**
- `policy_bypass_gate`
- `deny_by_default_gate`

**Artifacts**
- `report.json`
- `metrics.json`
- `stamp.json`

---

### PR-2: Receipts + evidence resolver
**Files/paths**
- `libs/evidence/resolve.ts|py`
- `services/evidence-ledger/`
- `schemas/receipt.v0.1.json`

**CI gates**
- `evidence_resolution_gate` (0 dangling)
- `receipt_schema_gate`

**Artifacts**
- `report.json`
- `metrics.json`
- `stamp.json`
- `citation_proof.json`

---

### PR-3: Sandboxed skill runtime + capability tokens
**Files/paths**
- `runtime/sandbox/`
- `schemas/skill.manifest.v0.1.json`
- `schemas/skill.permissions.v0.1.json`

**CI gates**
- `sandbox_escape_suite`
- `capability_scope_suite`

**Artifacts**
- `report.json`
- `metrics.json`
- `stamp.json`

---

### PR-4: Verified skill registry + signing + reproducible build checks
**Files/paths**
- `tools/skillpack/`
- `services/skill-registry/`

**CI gates**
- `verified_skill_conformance_gate`
- `supply_chain_attestation_gate`

**Artifacts**
- `report.json`
- `metrics.json`
- `stamp.json`
- `citation_proof.json`

---

### PR-5: Trust Dashboard + SLOs
**Files/paths**
- `ops/dashboards/audit_readiness.json`
- `synthetics/` (canaries)

**SLOs**
- `auditor_verify_p95 < 20s`
- `citation_resolve = 100%`
- `policy_check_coverage = 100%`

**CI gate**
- `slo_regression_gate`

**Artifacts**
- `report.json`
- `metrics.json`
- `stamp.json`

---

### PR-6: White-label tenancy overlays
**Files/paths**
- `tenancy/` (policy overlays, branding, retention, kill-switch)
- `services/admin-console/` (endpoints)
- `services/export-bundles/`

**CI gates**
- `tenant_isolation_suite`
- `export_bundle_repro_gate`

**Artifacts**
- `report.json`
- `metrics.json`
- `stamp.json`
- `citation_proof.json`

---

### PR-7: Cost Router “cheap-by-default”
**Files/paths**
- `cost/router/`
- `finops/budgets/`

**CI gates**
- `cost_budget_gate`
- `routing_determinism_gate`

**Artifacts**
- `report.json`
- `metrics.json`
- `stamp.json`

---

### PR-8: Enterprise bridge hooks (don’t fork)
**Files/paths**
- `services/bridge/` (SSO/SCIM stubs, residency flags)
- `connectors/` (interface parity)

**CI gate**
- `enterprise_parity_contract_tests`

**Artifacts**
- `report.json`
- `metrics.json`
- `stamp.json`

## Assumptions + validation plan
**A1:** OpenClaw hype moment is real and tied to security controversy.
- **Validate:** weekly search/social mentions + inbound leads + recurring security reports.

**A2:** Cheaper-by-default achievable without degrading trust.
- **Validate:** cost ledger + budgets in v1 + publish unit economics per workflow.

**A3:** White-label demand exists (creators/SMB).
- **Validate:** pre-sell 10 design partners, retention + support burden tracked.

## GTM wedge (what we say + what we prove)
**Positioning:** “The provable personal agent.”
- Lead with security failures in open skill ecosystems and the need for verifiable governance.

**Proof assets**
- 30s demo: task → approval → receipt → replay/undo
- Public Trust Dashboard screenshots
- Verified Skills badge + install-time verification log

## Security / governance model
- Deny-by-default capabilities; Assist mode default; Autopilot only for pre-approved workflows.
- Scoped tokens, no ambient creds, egress allowlists, sandboxing.
- Mandatory `citation_proof.json` + evidence hash chain for every action.
- Kill switch + anomaly detection on receipts (policy violations, unusual egress, spend spikes).

## MAESTRO alignment
**MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.

**Threats Considered:** skill supply chain compromise, sandbox escape, token leakage, prompt injection, cross-tenant leakage, receipt tampering.

**Mitigations:** signed skill bundles + reproducible builds, sandbox escape suites, scoped tokens + egress allowlists, policy gating for tool calls, tenant isolation suites, receipt hash chain + replay verification, SLO canaries and audit verify button.

## Evals + regression tests (minimum viable)
- **Policy Coverage Eval:** 100% tool calls gated.
- **Evidence Resolution Eval:** 100% citations resolvable.
- **Sandbox Safety Eval:** escape probes fail; private network blocked.
- **Audit Latency Eval:** verify p95 < 20s.
- Output deterministic `metrics.json` + `stamp.json`.

## Product modes
- **Observe:** read-only receipts and evidence.
- **Assist:** approvals required on privileged actions.
- **Autopilot:** pre-approved workflows only.

## White-label overlays
- Tenant branding, policy overlays, retention controls, and admin audit export.
- Governed exceptions documented as **Governed Exceptions** with explicit approvals.

## Rollback posture
- Each PR includes a reversible plan and the DecisionLedger entry with rollback trigger and steps.

## Final directive
The Switchboard Flywheel ships as the governed enterprise core with fewer connectors, and every output remains evidence-first and exportable.
