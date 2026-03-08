# Pydantic v2 Validation Performance Standards

## Readiness Assertion Alignment

This standard is governed by the Summit Readiness Assertion and is enforced as a readiness-bound policy artifact. Implementations must treat any deviation as a Governed Exception with explicit evidence. See `docs/SUMMIT_READINESS_ASSERTION.md` for authoritative readiness criteria.

## Scope

This standard governs Pydantic v2 validation performance guidance, evidence artifacts, and CI budget enforcement for Summit-owned pipelines and harnesses.

## Non-Goals

- Replacing Pydantic or rewriting user models.
- Recommending skipped validation as a performance strategy.
- Making unconditional speed claims across all workloads.

## Claim-Traceable Principles (ITEM & DOC)

- Prefer `Annotated` constraints over Python field validators. (ITEM:CLAIM-01, ITEM:CLAIM-02)
- Prefer `model_validate_json()` / `validate_json()` for JSON inputs. (ITEM:CLAIM-03, DOC:CLAIM-06)
- Prefer `TypeAdapter` for bulk validation and reuse adapters across batches. (ITEM:CLAIM-04, DOC:CLAIM-07)
- Avoid `from_attributes` unless inputs are objects rather than dictionaries. (ITEM:CLAIM-05)

## Summit-Original Requirements

- Provide a deterministic performance harness that emits machine-verifiable evidence artifacts.
- Enforce configurable budgets in CI behind an explicit feature flag.
- Record drift signals for regression monitoring without logging payloads.

## Evidence IDs

Evidence IDs must use the following format and appear in report metadata and CI summaries:

- `PERF-PYDANTIC-<scenario>-<hash>`

## Evidence Artifacts (Deterministic)

Artifacts must be written under `artifacts/pydantic-perf/` using deterministic content only:

- `report.json`
- `metrics.json`
- `stamp.json` (no timestamps; git SHA is allowed if available)

## Data Handling & Never-Log List

- Payloads are synthetic only.
- Never log raw JSON inputs, full validation errors, or email-like strings.
- Artifacts must contain aggregated metrics only.

## CI Enforcement

- Budgets are enforced only when the explicit feature flag is enabled.
- Regression thresholds must be defined per scenario.
- Evidence artifacts must be schema-validated in unit tests.

## Governed Exceptions

Any deviation from these requirements must be recorded as a Governed Exception with evidence and rollback guidance.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Data, Tools, Observability, Security.
- **Threats Considered**: goal manipulation via performance shortcuts, tool abuse via unsafe fast paths, data leakage via artifacts.
- **Mitigations**: enforce evidence artifacts, ban raw payload logging, require feature-flagged CI gates and schema validation.
