# GOVOS-1 — Governed Multi-Agent OS (Moat Epic Program)

**Readiness Assertion:** This epic is governed by the Summit Readiness Assertion and the Law of Consistency. See `docs/SUMMIT_READINESS_ASSERTION.md` and `docs/governance/CONSTITUTION.md` for absolute readiness criteria.

## Operating Rule
Never defend the past. Only assert the present and dictate the future.

## Objective
Make governance non-optional, measurable, and fast to audit by delivering a Governed Multi-Agent OS v1 that binds policy, provenance, approvals, and evidence resolution into runtime and CI.

## Scope (Moat Seam 1)
1. Agentic control plane + governed multi-agent OS.
2. Governance as operational SLOs (auditor verify <20s, 100% citation resolution).
3. Non-bypassable policy checks with deny-by-default enforcement.
4. Evidence resolver as single source of truth across UI, agents, and exports.

## Evidence-First Output (UEF)
All deliverables emit a UEF bundle before narrative summaries.

**Required artifacts per run/PR**
- `report.json`
- `metrics.json`
- `stamp.json`
- `citation_proof.json`

**Evidence ID pattern**
```
EVID::<tenant>::<domain>::<artifact>::<yyyy-mm-dd>::<gitsha7>::<runid8>
```

## MAESTRO Threat Modeling Alignment
**MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.

**Threats Considered:**
- Policy bypass and confused deputy
- Token leakage and capability escalation
- Cross-tenant evidence access
- Approval spoofing
- Audit log tampering and provenance forgery

**Mitigations:**
- Deny-by-default policy checks at every tool/data boundary
- Signed capability tokens with short TTL + audience scoping
- Tenant-aware evidence resolver with RBAC and immutable content-addressed objects
- Approval workflow backed by Policy Graph nodes and reasoned decisions
- Append-only provenance ledger with hash chaining and integrity verification

## Assumptions & Validation Plan
**A1: Maestro/CompanyOS exists as orchestration + memory layer.**
- Validate by generating an as-built control plane map (service manifests + API discovery) in `docs/as-built/`.

**A2: Single evidence resolver can be enforced across UI/agents/exports.**
- Validate by CI gate: any user-visible claim must produce `citation_proof.json` with resolvable evidence IDs.

**A3: Observability stack can ingest audit metrics/traces.**
- Validate by dashboards + synthetic SLO tests; fail CI on regression.

## New Core Primitives
- **Policy Graph**: principals, roles, capabilities, resources, constraints, approvals, exceptions.
- **Provenance Graph**: evidence objects, transformations, model/config hashes, chain-of-custody.
- **Agent Identity + Capability Tokens**: every action is signed and scoped.
- **Flow Manifests**: declarative case/flow-as-code with approvals + evidence outputs.

## Epic: GOVOS-1 Issue Stack
### GOVOS-1.1 — Policy Graph MVP + Runtime Enforcement
**Scope**
- Add `schemas/gov/policy_graph.json`.
- Add `services/gov-policy/` APIs:
  - `Check(principal, action, resource, context) -> decision + obligations`
  - `Explain(decision_id) -> graph path + rules`
- Integrate with Maestro: every tool call and data access must call `Check()`.

**Acceptance Criteria**
- 100% agent tool invocations gated by policy checks.
- Deny-by-default for unknown actions/resources.
- Deterministic `stamp.json` includes policy version hash.

**CI Gates**
- `policy_bypass_test`
- `policy_deny_by_default_test`

**Evidence**
- `EVID::*::gov::policy_eval::*`

### GOVOS-1.2 — Provenance Graph + Evidence Resolver
**Scope**
- Add `schemas/gov/provenance_graph.json`.
- Add `libs/evidence/`:
  - `register_evidence(blob, metadata) -> evidence_id`
  - `resolve(evidence_id) -> metadata + hashes + access check`
- Store lineage for ingest → normalize → graph ops → model inference → report.

**Acceptance Criteria**
- Every report claim references ≥1 evidence_id and resolves under RBAC.
- Evidence objects are content-addressed and immutable.

**CI Gates**
- `evidence_resolution_gate`
- `immutability_gate`

**Evidence**
- `citation_proof.json` required for e2e tests.

### GOVOS-1.3 — Per-Agent Identity, Scoped Capabilities, Approval Workflows
**Scope**
- Introduce `AgentPrincipal` identities and capability tokens.
- Approvals:
  - `ApprovalRequest` nodes in Policy Graph
  - UI + API for approve/deny with reason
- Obligations: “must obtain approval from role X before export”.

**Acceptance Criteria**
- High-impact actions require approval path.
- Audit trail includes approver identity + reason + timestamp + evidence links.

**CI Gates**
- `approval_required_gate`
- `audit_trail_completeness_gate`

### GOVOS-1.4 — “Auditor Verify <20s” SLO + Dashboards
**Scope**
- SLOs:
  - `audit_verify_latency_p95 < 20s`
  - `citation_resolution_success = 100%`
  - `policy_check_coverage = 100%`
- Grafana dashboards under `ops/dashboards/`:
  - Audit Readiness
  - Policy Denials & Exceptions
  - Evidence Resolver Health

**Acceptance Criteria**
- Synthetic canary runs in CI/staging; fails if SLO regresses.
- Dashboards checked into repo.

**CI Gates**
- `slo_regression_gate`
- `dashboard_schema_lint`

### GOVOS-1.5 — Case/Flow as Code + Reproducible Replay
**Scope**
- `cases/*.yaml` defines allowed domains, required approvals, evidence outputs, deterministic seeds.
- `cli/govos_replay` reruns case and verifies hashes for `report.json` + `metrics.json`.

**Acceptance Criteria**
- Replay produces identical artifacts for fixed inputs.
- `stamp.json` captures dataset/model/config hashes.

**CI Gates**
- `replay_determinism_gate`

## Auditability Coverage Index (ACI)
**Benchmark:** ACI = % of user-visible assertions with resolvable evidence IDs, complete provenance lineage, policy decision trace, and replay determinism stamp.

**Gate:** ACI must be 100% for GA exports.

## Non-Negotiables
- Deny-by-default enforcement.
- Immutable evidence objects with content hashing.
- No silent attribution; publication requires approval + evidence completeness.
- Decision reversibility recorded in DecisionLedger with rollback triggers.

## Governance Outputs (Required for PRs)
- Decision rationale (why now)
- Confidence score (0–1) with basis
- Rollback plan (triggers + steps)
- Post-deploy accountability window + metrics
- Tradeoff ledger entry when cost/risk/velocity changes

## Sequencing (Compounding Lock-In)
1. GOVOS-1.1 + GOVOS-1.2 (policy + evidence core)
2. GOVOS-1.3 (identity + approvals)
3. GOVOS-1.4 (SLO + dashboards)
4. GOVOS-1.5 (replay determinism)

## Sub-Agent Prompts (Copy/Paste)
### Architect Agent
Draft the GOVOS-1 epic as repo-ready issues with file paths, APIs, schemas, and PR stack. Include `policy_check` middleware for Maestro, `evidence_resolver` library, `citation_proof.json` generation, and `govos_replay` CLI. Provide acceptance tests and CI gates for bypass prevention and replay determinism.

### Security Agent
Threat model the governed multi-agent OS: bypass, confused deputy, token leakage, cross-tenant evidence access, approval spoofing, audit log tampering. Define controls (signed capability tokens, deny-by-default, immutable evidence objects, log integrity, key mgmt) and a security test plan that runs in CI.

### Evals Agent
Create deterministic eval suites for Policy Coverage, Evidence Resolution, Audit Latency p95, and Replay Determinism. Define metrics schema for ACI and required thresholds. Provide synthetic datasets and invariants, and ensure outputs include report.json/metrics.json/stamp.json/citation_proof.json.

### Ops Agent
Specify dashboards and SLO plumbing for “Auditor verify <20s” and evidence resolver health. Add canary jobs, runbooks, alerting, and drift detection hooks. Ensure offline/air-gapped mode and reproducible builds; define artifact retention and backup policies for evidence objects.

### Product Agent
Write a GA product spec for “Governed Multi-Agent OS”: personas (analyst, admin, auditor), workflows (approvals, evidence proof, replay), and packaging (CI Sheriff + Audit Readiness Dashboard as modules). Include customer-facing SLO commitments and the replacement-cost story without overclaiming.

## Finality
Governance is operationalized now, enforced by default, and provable on demand.
