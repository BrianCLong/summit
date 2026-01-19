# AI-First Engineering OS (Summit + Maestro)

## Directive

Summit treats AI-generated code as a governed input to the software supply
chain. The default lifecycle is Intent → Evidence → Merge. Intent Specs and
verification artifacts are mandatory for AI-generated changes, and they are
reviewed as primary evidence, not commentary.

## Operating Principles

- Intent defines scope, invariants, and acceptance tests.
- Evidence proves the intent with deterministic checks.
- Provenance binds prompts, diffs, and results.
- Review focuses on system meaning and invariants, not line-by-line syntax.

## Intent → Evidence → Merge

1. **Intent Spec**
   - Stored in `.summit/intent/` and validated against
     `schemas/intent-spec.schema.json`.
2. **Verification**
   - Automated or manual acceptance tests define pass/fail criteria.
   - Sensitive changes must declare automated acceptance tests.
3. **Merge Decision**
   - Evidence is required; waivers must be explicitly recorded.

## Maestro Review Focus

Maestro surfaces the Intent Spec, invariants, risk level, and evidence status.
Reviewers validate alignment between the intent and the change boundary rather
than re-litigating syntax. This restores human meaning and preserves craft at a
systems level.

## Governance Alignment

- Summit readiness is enforced via the Summit Readiness Assertion.
- Deterministic gates prevent quality collapse while AI accelerates output.
- Exceptions are treated as governed exceptions with explicit rationale.

Reference: `docs/SUMMIT_READINESS_ASSERTION.md`.
