# Summit Governed CI/CD Evidence Pipeline

This document defines the governed CI/CD pipeline for Summit, aligned with the Summit Readiness Assertion and the governance mandates in `docs/governance`. The pipeline enforces deterministic policy checks, evidence generation, and promotion gates with provenance receipts.

## Objectives

- Deterministic policy preflight checks (OPA/Rego).
- Evidence bundle generation with control mappings.
- Governance verification gate before promotion.
- Provenance receipt capture (SLSA-aligned).
- Artifact promotion only after governance verdict is allow.

## Pipeline Overview

1. **Build + Test** (existing CI steps)
2. **Policy Preflight** (`policy_preflight.yml`)
3. **Evidence Bundle Generation** (`evidence_bundle_generator.yml`)
4. **Governance Verdict Gate** (`verify_governance_verdict.sh`)
5. **Promotion** (`tag_and_sign.sh` in CI)

### Determinism Rules

- No timestamps or nondeterministic fields in evidence.
- Evidence IDs are sourced from `governance/policy-mapping-registry.yml`.
- Governance verdicts use deterministic inputs only.
- Decision logic is versioned in `packages/decision-policy/policy.v3.yaml`.

## Evidence Bundle Structure

Evidence bundles follow this contract:

```json
{
  "schema_version": "1.0",
  "bundle_version": "1.0",
  "policy_registry": "governance/policy-mapping-registry.yml",
  "evidence": [{ "id": "EV-001", "status": "present" }],
  "provenance": { "predicate_type": "https://slsa.dev/provenance/v1" }
}
```

Example bundles are stored in `docs/ci/examples/` for review.

## Governance Control Matrix

| Evidence ID | Artifact                  | Controls                                     | Required |
| ----------- | ------------------------- | -------------------------------------------- | -------- |
| EV-001      | Unit Test Coverage        | SSDF v1.2 PR.2, SOC-2 CC7.2, NIST SA-11       | Yes      |
| EV-002      | Lint + Static Analysis    | SSDF v1.2 ST.1, SOC-2 CC7.3                   | Yes      |
| EV-003      | OPA Policy Preflight      | SSDF v1.2 PO.3, SOC-2 CC2.1                   | Yes      |
| EV-004      | Provenance Receipt (SLSA) | SLSA 1.0, NIST SA-12                          | Yes      |

## Governance Verification Runner

The governance runner config is stored in `governance/verdict-runner.json` and executes:

```bash
./scripts/verify_governance_verdict.sh \
  --evidence artifacts/evidence-bundle.json \
  --policy governance/evidence-id-policy.yml
```

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Tools, Infra, Observability, Security.
- **Threats Considered**: policy drift, evidence tampering, provenance spoofing, tool misuse.
- **Mitigations**: deterministic evidence bundles, policy-as-code (OPA/Rego), gated promotion, explicit verification scripts.

## Operational Notes

- Evidence generation is deterministic; re-runs should be identical.
- Promotion is gated on an allow verdict; failures require remediation before promotion.
- See `governance/policy-mapping-registry.yml` for authoritative evidence definitions.
