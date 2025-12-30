# Merge Priority Playbook

This playbook captures the current release-blocking priorities and the execution order to stabilize `main` and keep CI green. Treat it as the short decision log for the release captain: each item lists the goal, success signal, and immediate next step.

## Immediate actions (Priority 0)

1. **Unblock Jest**
   - **Action**: merge PR #15141 (removes ESM misconfiguration and temp-disables failing setup).
   - **Success signal**: `pnpm test` (root) and the Jest CI lane complete without configuration errors.
   - **Next step**: re-enable the temporary setup path once flakes are addressed.
2. **Fix Vite build**
   - **Action**: merge PR #15139 to clear `apps/web` build failures.
   - **Success signal**: `pnpm --filter apps/web build` succeeds locally and in CI; Vite lane turns green.
   - **Next step**: capture any remaining warnings as debt items.
3. **Verify CI gates**
   - **Action**: after Jest/Vite land, confirm which workflow checks are required vs informational on `main`, and document/lock them as policy.
   - **Success signal**: required checks recorded in `docs/CI_STANDARDS.md` and protected-branch settings updated.
   - **Next step**: prune noisy/duplicated workflows once the required set is locked.

## Stabilization & debt guardrails (Priority 1)

4. **Adopt Debt Retirement Engine**
   - **Action**: evaluate PR #15143. Enforce "no new debt" while allowing budgeted legacy debt with clear burndown plans.
   - **Success signal**: CI fails on _new_ debt while existing debt is budgeted and visible.
   - **Next step**: publish budgets/playbooks and add the gate to the protected branch only after Jest/Vite/CI gates are stable.

## Correctness and type safety (Priority 2)

5. **Merge type-safety follow-ups**
   - **Action**: land PR #15142 to remove `@ts-ignore` usages and harden DataLoader patterns once CI is stable.
   - **Success signal**: type checks and tests stay green without the suppressed errors.
   - **Next step**: add regression tests for fixed call-sites.

## GA/RC operationalization (Priority 3)

6. **Release automation**
   - **Action**: drive issue #14701 to produce GA tagging/release pipelines (changelog, artifacts, SBOM/provenance attachments).
   - **Success signal**: tagged releases produce artifacts and provenance/SBOM automatically in CI.
   - **Next step**: codify changelog guardrails and promote to the default release job.
7. **Auditor-ready evidence**
   - **Action**: implement issues #14700 and #14698 to generate SOC control unit tests and evidence bundle templates integrated with CI.
   - **Success signal**: evidence bundles and control tests are generated per build and archived as artifacts.
   - **Next step**: wire evidence outputs into the GA gate with retention policy.
8. **Release-captain checklist**
   - **Action**: complete issue #14699 with a checklist mapped 1:1 to GA gate jobs.
   - **Success signal**: every checklist item has a corresponding CI job or script output.
   - **Next step**: publish the checklist next to the GA gate config and require it for cutover.

## Documentation quality (Priority 4)

9. **Bundle doc reviews**
   - **Action**: close the backlog of "Review X.md" issues (e.g., ADMIN-CONFIG.md, SCALING.md, SECURITY_INCIDENT_PIPELINE.md) via a single QA pass.
   - **Success signal**: updated docs with validated commands and a single tracking issue closed.
   - **Next step**: add markdownlint/docs-check to CI to prevent regressions.

## Recommended execution order

1. Merge #15141 (Jest) → 2) Merge #15139 (Vite) → 3) Validate required CI checks on `main` → 4) Merge #15142 (type safety) → 5) Decide/land #15143 (Debt Engine) with GA integration → 6) Drive GA operational issues (#14701, #14700, #14699/#14698) as a single "Release Automation & Evidence" epic.

## Validation checklist

- Jest suite runs locally and in CI after #15141.
- Vite build succeeds for `apps/web` after #15139.
- Required CI checks are documented and enforced on the default branch.
- Debt Retirement Engine enforces "no new debt" without blocking legacy remediation work.
- GA automation produces tagged releases with attached SBOM/provenance artifacts and evidence bundles.
- Auditor evidence bundles are retained as CI artifacts and linked in release notes.
