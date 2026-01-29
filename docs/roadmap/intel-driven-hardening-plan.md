# Intel-Driven Hardening Plan (2026-01)

This roadmap operationalizes the insights from the January 2026 Threat Signal Map.

## Priority 1: Semantic Validation (Blocker for GA)

**Objective:** Close the critical gap in `Conductor` where semantic validation returns stub values.
**Owner:** Jules (Architecture) / Codex (Implementation)
**Target:** Sprint 26
**Artifacts:**

* `server/src/conductor/validation/semantic-validator.ts`: Implement `checkSemanticDrift` using embedding distance.
* **Evidence:** `audit/ga-evidence/governance/semantic-validation-results.json`

## Priority 2: Immutable Model Signing

**Objective:** Prevent "Polyglot Ransomware" by ensuring only signed models are loaded.
**Owner:** Orion (CI/Reliability)
**Target:** Sprint 27
**Artifacts:**

* `scripts/ci/sign_models.sh`: New CI step to sign model artifacts.
* `server/src/ai/model_loader.ts`: Verify signature before load.
* **Evidence:** `audit/ga-evidence/supply-chain/model-signatures.json`

## Priority 3: Context-Aware Policy Enforcement

**Objective:** Prevent role escalation via prompt injection.
**Owner:** Aegis (Security)
**Target:** Sprint 28
**Artifacts:**

* `server/src/policies/opa/context_policy.rego`: New Rego rules inspecting context window size/content.
* `server/src/middleware/policy_enforcer.ts`: Pass context metadata to OPA.
* **Evidence:** `audit/ga-evidence/governance/policy-decisions.json`

## Priority 4: Identity Graph Anomaly Detection

**Objective:** Detect "Identity Permutation" attacks.
**Owner:** Jules (Architecture)
**Target:** Post-GA (Fast-Follow)
**Artifacts:**

* `server/src/analytics/identity_graph.ts`: Real-time query for role assumption velocity.
* **Evidence:** `docs/reports/identity-graph-effectiveness.md`

## Execution Strategy

These items are added to the `docs/release/QUEUE.md` as "Bucket A - Critical Path" for GA readiness.
