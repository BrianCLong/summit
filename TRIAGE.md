# Triage & Governance Checklist

This document outlines the immediate steps for triaging the backlog and ensuring repository health, governance, and CI stability.

## 1. Triage the "triage-needed" backlog

- [ ] **Review "No one assigned" issues**: Filter for issues marked "Done" or "In Progress" but with no assignee.
  - Example: Audit logging (#11675), Flag wiring (#11015).
- [ ] **Action**: Assign an owner or close if completed.
- [ ] **Milestone Assignment**: Move active issues to the current milestone.

## 2. Governance Drift (P0 Repo Health)

- [x] **Verify Required Checks**: The list of required checks has been updated in `required_checks.todo.md` based on `ci-core.yml`.
  - **Verified Checks**: `CI Core Gate ✅`, `Golden Path Smoke Test`, `Governance / Branch Protection Drift`.
- [ ] **Branch Protection Rules**: Ensure GitHub repository settings match `required_checks.todo.md`.
  - Go to Settings -> Branches -> Branch protection rules -> Edit `main`.
  - Confirm "Require status checks to pass before merging" is checked.
  - Confirm the checks listed in `required_checks.todo.md` are selected.

## 3. CI Source of Truth

- [x] **Workflow Verification**: Confirmed that `ci-core.yml` is the orchestration workflow.
- [ ] **Monitor Drift**: The `branch-protection-drift` job in CI will alert on discrepancies. Monitor this job.

## 4. Golden Path Quality Gate

- [x] **Identify Golden Path**: The `Golden Path Smoke Test` job (`golden-path`) runs `e2e/golden-path.spec.ts`.
- [ ] **Enforce Non-Negotiable**: Ensure this job is always required for merge (it is part of `CI Core Gate ✅`).
- [ ] **Expand Coverage**: Add more critical user flows to `e2e/golden-path.spec.ts` to cover the "golden path".

## 5. Security/Ops Hardening Evidence

- [x] **Evidence Pattern**: A template for manual evidence bundles has been created in `evidence/templates/ops-hardening/`.
- [ ] **Backfill Evidence**: For closed Ops/Security items (e.g., "DR/BCP Offline Kit"), create an evidence bundle using the template.
  - Copy `evidence/templates/ops-hardening/` to a new folder in `evidence/`.
  - Fill in `report.json` with details and links.
  - Commit and push.

## Next Steps

1.  Run the **Triage Pass** (Step 1).
2.  **Audit Branch Protection** settings in GitHub (Step 2).
3.  **Backfill Evidence** for critical closed items (Step 5).
