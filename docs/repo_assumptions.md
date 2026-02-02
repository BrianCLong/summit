# Repo Assumptions (Subsumption Bundle Scaffold)

## Verified vs Assumed

| Item | Status | Evidence |
| --- | --- | --- |
| Workspace uses pnpm with Node 18+ | Verified | `package.json` lists `packageManager: pnpm@9.12.0` and Node engine `>=18.18`. |
| Primary schema registry lives under `schemas/` | Verified | `schemas/` contains evidence and governance schemas. |
| Evidence bundle artifacts use `report/metrics/stamp` JSON naming | Verified | `evidence/report.json`, `evidence/metrics.json`, `evidence/stamp.json`. |
| Required checks policy is governed under `docs/ci/REQUIRED_CHECKS_POLICY.yml` | Verified | File present under `docs/ci/`. |
| Roadmap status is tracked in `docs/roadmap/STATUS.json` | Verified | File is present and validated by `scripts/validate-roadmap-status.cjs`. |
| CogOps implementation module location | Deferred pending repo alignment | No in-repo `cogops` module currently defined; path to be confirmed. |
| Evidence ID conventions for CogOps | Deferred pending evidence-gate mapping | Existing evidence ID policies are present; CogOps ID pattern requires integration review. |

## Must-not-touch (current constraint set)

| Area | Constraint |
| --- | --- |
| `.github/workflows/` | Do not edit existing workflows; add new workflows only if required by governance gate. |
| `docs/ci/REQUIRED_CHECKS_POLICY.*` | Update only with explicit gate requirements and corresponding evidence. |
| `schemas/evidence*` | Do not change shared evidence schemas without a dedicated governance decision. |
| `scripts/ci/*` | Avoid modifying CI gate scripts unless explicitly scoped. |

## Validation plan

1. Confirm CogOps module placement and ownership boundaries using `docs/REPO_BOUNDARIES.md` and `scripts/check-boundaries.cjs`.
2. Map evidence ID conventions against `scripts/ci/verify_evidence_id_consistency.mjs` and relevant schema docs.
3. Align CogOps schema naming with `schemas/index_catalog.yaml` after schema addition.
