# Required Checks Contract

**Version**: 1.0.0  
**Last Updated**: 2026-01-09  
**Authority**: Platform Engineering  
**Readiness Anchor**: [`docs/SUMMIT_READINESS_ASSERTION.md`](../SUMMIT_READINESS_ASSERTION.md)

## Purpose

This contract defines the **minimal, stable set of required check names** used for branch
protection and merge queue enforcement. It ensures check names remain durable across workflow
refactors while preserving GA-safe governance and compliance gates.

## Principles

1. **Stability First**: Required check names are immutable identifiers, not implementation details.
2. **Minimal Set**: Keep the list to the smallest set that preserves coverage.
3. **Umbrella Jobs**: Matrix or split jobs must roll up into stable, non-matrix “umbrella” checks.
4. **No Bypass**: Required checks must always execute or explicitly fail.
5. **Governance Alignment**: Contract changes must align with the governance authority chain in
   [`docs/governance/CONSTITUTION.md`](../governance/CONSTITUTION.md).

<!-- CONTRACT:START -->

```yaml
version: "1.0.0"
last_updated: "2026-01-09"
checks:
  - "ci / build"
  - "ci / governance"
  - "ci / lint"
  - "ci / provenance"
  - "ci / schema"
  - "ci / security"
  - "ci / smoke"
  - "ci / test"
  - "ci / typecheck"
```

<!-- CONTRACT:END -->

## Mapping to CI Implementation

All contract checks are produced by `.github/workflows/ci.yml` using **stable job names**. Internal
changes (splits, matrices, refactors) must continue to roll up into these stable checks.

| Required Check    | CI Job (Workflow `ci`) | Coverage                                    |
| ----------------- | ---------------------- | ------------------------------------------- |
| `ci / build`      | `build`                | Deterministic/reproducible build validation |
| `ci / governance` | `governance`           | Governance compliance checks                |
| `ci / lint`       | `lint`                 | Lint + code hygiene enforcement             |
| `ci / provenance` | `provenance`           | Provenance unit checks                      |
| `ci / schema`     | `schema`               | GraphQL/API schema compatibility checks     |
| `ci / security`   | `security`             | Security scans (dependency, SAST/SCA)       |
| `ci / smoke`      | `smoke`                | Golden path smoke test                      |
| `ci / test`       | `test` (umbrella)      | Aggregates matrix test suites               |
| `ci / typecheck`  | `typecheck`            | TypeScript type safety checks               |

## Change Policy

Changing this contract **requires**:

1. **Governance approval** per [`docs/governance/AGENT_MANDATES.md`](../governance/AGENT_MANDATES.md).
2. A documented migration plan in `docs/release/GA_DECISIONS.md`.
3. Updates to:
   - `docs/ci/REQUIRED_CHECKS_POLICY.yml`
   - `.github/protection-rules.yml`
   - Workflow job names in `.github/workflows/`
4. Validation by the branch protection drift tooling and required checks tests.

This contract is the authoritative list for branch protection required checks. All policy and CI
implementations must conform to it.
