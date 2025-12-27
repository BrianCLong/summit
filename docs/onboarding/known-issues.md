# Known Issues / Gotchas

## 1. CI standards are strict and consolidated

The CI standards expect a full quality gate (lint, typecheck, security, unit tests, and golden
path smoke tests). Plan extra time to run the full suite locally if you are changing workflow
or policy logic. See [docs/CI_STANDARDS.md](../CI_STANDARDS.md).

## 2. Boundary checks fail when crossing zones

If a change spans multiple zones (server, web, client), the boundary checker will flag it.
Keep each PR scoped to a single zone or move shared logic into `packages/`. Run
`node scripts/check-boundaries.cjs` early to avoid late surprises.

## 3. Evidence pack completeness is required

Evidence packs must include policy decision logs and CI run references. Missing evidence
usually results in a re-request or a gated PR review.

## 4. Canary thresholds must be actionable

Avoid overly permissive canary thresholds. The rollout checklist expects explicit rollback
criteria and alert escalation paths.
