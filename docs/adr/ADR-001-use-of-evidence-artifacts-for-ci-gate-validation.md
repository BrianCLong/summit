# ADR-001: Use of Evidence Artifacts for CI Gate Validation

## Status
Accepted

## Context
In Summit, validating pull requests and enforcing security checks is critical to maintaining repository integrity. A purely script-based return code approach (`0` for success, non-zero for failure) is difficult to audit and lacks a clear, machine-readable paper trail for why a check passed or failed. We need a verifiable, deterministic way to record the outcome of automated checks such that CI workflows can make policy decisions based on structured data rather than opaque exit codes.

## Decision
We have decided to use deterministic JSON/YAML evidence artifacts stored in the `evidence/` directory as the primary mechanism for CI gate validation.

- Automated processes (e.g., tests, security scans, validations) must produce a structured artifact reporting their results.
- These artifacts are evaluated by CI policies (e.g., `ci-policy.yml`) to determine if a gate should be passed or blocked.
- Artifacts must conform to strict JSON schemas located in `schemas/evidence/` to ensure machine readability and consistency.
- Evidence files act as a verifiable ledger of system state at the time of validation.

## Consequences

**Positive:**
- High auditability: The exact results of every check are stored as structured data.
- Decouples check execution from policy enforcement: Scripts just generate evidence; CI policies read the evidence to make decisions.
- Easier to debug CI failures by inspecting the generated JSON/YAML artifacts.

**Negative:**
- Increased complexity: Developers must learn to write schemas and evidence generation scripts rather than just returning exit codes.
- Overhead in CI workflows to parse and validate evidence contracts using tools like `scripts/determinism/validate_evidence_contracts.py`.
