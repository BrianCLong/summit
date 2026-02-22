# Model Mesh Policy Pack (Summit)

**Status:** Active, enforceable, and aligned with the Summit Readiness Assertion.

## Authority & Alignment

- **Primary authority:** `docs/SUMMIT_READINESS_ASSERTION.md`
- **Governing law:** `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`
- **Mandates:** `docs/governance/AGENT_MANDATES.md` and `docs/ga/`
- **Policy engine:** All regulatory/ethics logic is enforced as policy-as-code in the policy engine.

## Executive Intent (The End State)

1. **Anti-lock-in + continuity:** The mesh sustains operations under pricing, access, or quality shifts.
2. **Cost/perf dominance:** Route routine work to low-cost models; reserve premium capacity for hard tasks.
3. **Sovereignty + deploy-anywhere:** Open-weight models enable VPC, sovereign cloud, and edge delivery.
4. **Moats via orchestration:** The router, policies, provenance, and replayable runs are the moat.
5. **Continuous adversarial benchmarking:** Promotion/demotion is driven by internal task harness results.

## Model Tiers (Extent of Use)

### Tier A — Trusted / Primary (Sensitive + Core)

**Use for:** Customer data, secrets, exploit details, private repos, and regulated workflows.

**Controls:**

- Strict policy gating with evidence bundles.
- Full audit logging with immutable provenance chains.
- Approved “gold set” only (curated, monitored, and validated).

### Tier B — Sovereign Open-Weight (Default Workhorse)

**Use for:** Day-to-day engineering at scale, refactors, tests, docs, internal agents, offline/air-gapped work.

**Controls:**

- Runs in Summit-controlled infrastructure (VPC/edge).
- Deterministic eval loops and reproducible runs.
- Graduates only when security posture and licensing are certified.

**Default stance:** Heavy usage where quality meets requirements.

### Tier C — Untrusted / External (Cheap + Fast + Disposable)

**Use for:** Sandbox tasks, benchmarking, and non-sensitive work.

**Controls:**

- Strict data classification gate (public/internal only).
- Prompt hygiene with redaction and minimized artifacts.
- All outputs treated as untrusted until verified.

**Default stance:** Moderate usage for cost relief and competitive benchmarking.

## Provider-Specific Posture (Current and Enforceable)

- **Mistral (Open-Weight):** Default “workhorse fleet” in Tier B where quality suffices.
- **DeepSeek (External/Variable License):** Tier C only until license clearance and security review are complete. Production use is **deferred pending legal clearance** and security posture validation.
- **Manus-like Agent Services:** Tier C only, limited to disposable or synthetic tasks. Production dependency is **intentionally constrained** due to regulatory volatility.

## Policy Controls (Router + Registry + Gates)

### 1) Model Registry

- Capabilities, context limits, tool access, cost, latency, failure modes, license tags.
- Security posture metadata (data handling, retention, jurisdiction).

### 2) Data Classification Gate

| Data Class | Eligible Tiers                              | Notes                                     |
| ---------- | ------------------------------------------- | ----------------------------------------- |
| Public     | A/B/C                                       | External calls allowed with redaction.    |
| Internal   | A/B (C allowed with redaction + no secrets) | Tier C restricted to non-sensitive tasks. |
| Secret     | A only                                      | External calls blocked.                   |
| Regulated  | A only                                      | Evidence bundle required.                 |

### 3) Prompt & Artifact Hygiene

- Redact secrets and minimize repo exfiltration.
- External calls store only hashes or bounded artifacts.
- All Tier C outputs are verified or discarded.

### 4) Routing Defaults

- **Coding agent loops:** Tier B default; escalate to Tier A on failure or sensitivity.
- **Long-context codebase tasks:** Tier B default; Tier C allowed only for internal/public data.
- **Autonomous “do-things-on-the-internet” agents:** Tier C only on disposable work.

### 5) Graduation Rule (C → B → A)

Promotion is allowed only after all of the following are complete:

- **License clearance** for the exact model/version.
- **Security review** (data handling, retention, jurisdiction).
- **Benchmark proof** on Summit-specific tasks.
- **Policy-as-code integration** with test coverage.

## Governed Exceptions

Legacy bypasses are treated as **Governed Exceptions** only when they are:

- Documented with scope, owner, and expiry.
- Protected by compensating controls.
- Approved via the policy engine and recorded in the provenance ledger.

## Evidence & Audit Requirements

- All tier decisions emit a provenance record with policy evaluation results.
- Regulated or secret-tier runs must attach an evidence bundle.
- Policy gates are enforced at request time and re-evaluated at execution time.

## Operator Runbook (Short Loop)

1. **Classify** the data (public/internal/secret/regulated).
2. **Route** through the mesh based on tier eligibility and cost/latency budgets.
3. **Verify** Tier C outputs before reuse.
4. **Record** provenance and attach evidence bundles where required.
5. **Benchmark** contenders continuously; promote/demote automatically.

## Compliance Notes

- Regulatory requirements are implemented exclusively as policy-as-code in the policy engine.
- Any workflow that cannot be expressed as policy-as-code is considered incomplete and blocked.

## Implementation Checklist (Immediate)

- [ ] Register all models with license/security metadata.
- [ ] Enforce data classification in the routing layer.
- [ ] Implement redaction + artifact minimization for external calls.
- [ ] Add benchmark harness hooks for automated promotion/demotion.
- [ ] Wire provenance + evidence bundles into every routed execution.

**Finality:** This policy is active. Deviations are blocked unless approved as Governed Exceptions.

## 23rd-Order Imputed Intention (Governed Intent Ladder)

This ladder dictates how the mesh interprets downstream intent beyond the immediate request. Each
order is a governed amplification of objectives, not a deviation.

1. **Order 1 — Direct Task Outcome:** Execute the requested action within policy bounds.
2. **Order 2 — Data-Class Compliance:** Enforce the data classification gate for the task.
3. **Order 3 — Safety Floor:** Apply baseline safety constraints and disallow forbidden data paths.
4. **Order 4 — Least-Cost Fit:** Prefer the lowest-cost eligible model that meets quality targets.
5. **Order 5 — Latency Budget:** Prefer the fastest eligible model within SLA.
6. **Order 6 — Sovereignty Preference:** Prefer sovereign/open-weight deployments when available.
7. **Order 7 — Tool-Minimization:** Restrict tool use to the minimum required for task completion.
8. **Order 8 — Artifact Minimization:** Persist only bounded artifacts with hashes for external calls.
9. **Order 9 — Provenance Integrity:** Ensure every decision emits an immutable provenance record.
10. **Order 10 — Evidence Sufficiency:** Attach evidence bundles for regulated or sensitive runs.
11. **Order 11 — Drift Detection:** Compare output against policy constraints and known failure modes.
12. **Order 12 — Regression Guard:** Reject outputs that degrade prior benchmarked quality.
13. **Order 13 — Bench Alignment:** Route to models that are currently top-ranked for the task class.
14. **Order 14 — Failure Escalation:** Escalate to higher tier when verification fails.
15. **Order 15 — Multi-Model Consensus:** Require corroboration for high-impact decisions.
16. **Order 16 — Replayability:** Ensure the run is reproducible with the same inputs and policy.
17. **Order 17 — Disclosure Control:** Limit output scope to authorized recipients and contexts.
18. **Order 18 — Risk Posture:** Prefer conservative outputs when ambiguity crosses thresholds.
19. **Order 19 — Audit Readiness:** Maintain artifacts needed for audit without over-retention.
20. **Order 20 — Cost Forecasting:** Record cost deltas and projected impact on budgets.
21. **Order 21 — Provider Resilience:** Avoid single-provider dependency in critical workflows.
22. **Order 22 — Policy Evolution:** Flag gaps where policy-as-code requires extension.
23. **Order 23 — Mission Alignment:** Ensure outputs reinforce Summit’s readiness assertion and
    governance doctrine as the final arbitration layer.
