# ADR-AG-GOVCI-001: Governed CI/CD Evidence Pipeline

## Status
Accepted

## Context
Summit requires deterministic policy enforcement, evidence generation, and governance gates for CI/CD promotion. Existing workflows cover build/test gates but lacked a unified evidence bundle pipeline tied to control mappings and a governance verdict runner.

## Decision
Adopt a governed CI/CD evidence pipeline with OPA preflight checks, deterministic evidence bundle generation, and a governance verdict gate. Evidence IDs map to SOC-2/SSDF/NIST/SLSA controls via `governance/policy-mapping-registry.yml` and `governance/evidence-id-policy.yml`. Decision logic is versioned in `packages/decision-policy/policy.v3.yaml`.

## Rationale
- Enforces deterministic policy-as-code verification.
- Produces reproducible evidence bundles aligned to compliance controls.
- Gates promotion on explicit governance verdicts.

## Consequences
- CI jobs now include governance preflight, evidence generation, and verdict gate.
- Evidence generation depends on deterministic inputs and policy registry integrity.

## Rollback Plan
- Remove governance jobs from `.github/workflows/ci.yml`.
- Revert `policy/governance/ci-preflight.rego` and evidence generator scripts.
- Re-run CI to confirm baseline behavior restored.

## Confidence
0.62 (based on alignment with existing governance tooling and minimal invasive workflow changes).

## Accountability Window
14 days post-merge, monitor governance gate failures and evidence bundle determinism.
