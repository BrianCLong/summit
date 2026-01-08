# Dependency Approval Runbook

## Overview
This runbook describes the process for managing dependency changes in the IntelGraph Platform release cycle. We use a "ratcheting" approach where every release is compared against a baseline to detect new dependencies, license changes, or high-risk updates.

## Workflow

### 1. Detection
The CI pipeline (`Release Dependency Gate`) automatically runs on every PR and Tag.
It generates:
- **SBOM**: `dist/evidence/sbom/sbom.spdx.json`
- **License Inventory**: `dist/evidence/licenses/license-inventory.json`
- **Diff Report**: `dist/evidence/deps/deps-diff.md`
- **Policy Check**: `dist/evidence/deps/policy-check.json`

### 2. Policy Evaluation
The system checks against `policy/release-deps-policy.json`.
- **LOW RISK**: Minor updates, allowed licenses. No approval needed.
- **MEDIUM RISK**: Major version bumps, new dependencies. Requires 1 approver.
- **HIGH RISK**: Denied/Review licenses, flagged packages (crypto, auth). Requires 2 approvers.

### 3. Approval Process (If Required)
If the CI fails with "NEEDS_APPROVAL", follow these steps:

1. **Review the Diff**:
   Check `dist/evidence/deps/deps-diff.md` to see what changed.

2. **Generate Approval Locally**:
   Run the tools locally to reproduce the evidence and sign off.

   ```bash
   # Generate artifacts
   npx tsx scripts/release/generate_sbom.ts
   npx tsx scripts/verification/diff_dependency_baseline.ts
   npx tsx scripts/release/check_policy.ts

   # Approve (if you are authorized)
   npx tsx scripts/release/approve_dependencies.ts <your-username> APPROVE "Reviewed security impact of new deps"
   ```

3. **Commit the Approval**:
   The script creates `dist/evidence/approvals/deps-approval.json`.
   Commit this file to the repository (or include it in the release bundle if doing artifact-based releases).

   ```bash
   git add dist/evidence/approvals/deps-approval.json
   git commit -m "chore: approve dependency changes for release vX.Y.Z"
   ```

### 4. Updating Baseline
After a successful release, the new SBOM should become the baseline for the next release.
Copy the normalized SBOM to the baseline location:

```bash
cp dist/evidence/sbom/sbom.normalized.json dist/evidence/deps/baseline.json
git add dist/evidence/deps/baseline.json
git commit -m "chore: update dependency baseline"
```

## Troubleshooting
- **Missing Baseline**: If `dist/evidence/deps/baseline.json` is missing, all dependencies are treated as NEW (High Risk). Seed it by running a full generation on the `main` branch.
- **Unknown Licenses**: Ensure `pnpm install` works or update the known licenses map in `scripts/release/generate_license_inventory.ts` for internal packages.
