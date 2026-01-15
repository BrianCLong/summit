# Intent Specification (Summit)

## Purpose

Intent Specs are the primary artifact for AI-assisted changes. They define the
problem, constraints, invariants, acceptance tests, and risk posture that must
remain consistent through review and merge. This keeps review focused on system
meaning rather than syntax, and it supplies deterministic gates for AI-produced
changes.

## Storage

Store Intent Specs alongside the change in `.summit/intent/` as YAML or JSON.
Each file must validate against `schemas/intent-spec.schema.json`.

## Required Fields

- `problem_statement`: The concrete problem the change solves.
- `user_impact`: Expected user-facing impact.
- `non_goals`: Explicitly out-of-scope items for this change.
- `constraints`: Requirements (performance, security, compliance, etc.).
- `invariants`: Conditions that must never regress.
- `acceptance_tests`: Human-readable tests with optional command hooks.
- `risk_level`: `low | medium | high` with rationale.

## Acceptance Test Format

Each `acceptance_tests` entry is an object:

- `description` (required)
- `type` (required: `manual`, `automated`, `analysis`)
- `command` (recommended for automated tests)
- `evidence` (optional evidence pointer)

## Change Contracts (Sensitive Areas)

When a change touches sensitive subsystems—auth, policy, crypto, data access,
billing, or key infrastructure—Intent Specs must include at least one automated
acceptance test with a command. This ensures the contract is verifiable and the
review is anchored to evidence.

## CLI Usage

Validate all intent specs:

```bash
node scripts/intent/summit-intent.mjs validate
```

Validate a single intent spec:

```bash
node scripts/intent/summit-intent.mjs validate --file .summit/intent/intent-spec-pr1.yaml
```

## CI Enforcement

The PR quality gate runs `scripts/ci/validate-intent-spec.mjs`. Validation is
required when the PR is AI-generated (AGENT metadata present) or when changed
files match sensitive patterns. When required, at least one intent spec must be
present and valid.

## Governance Alignment

Intent Specs are governed artifacts. They align with the Summit Readiness
Assertion and enforce the Law of Consistency across AI-generated changes.
See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness posture and escalation
requirements.
