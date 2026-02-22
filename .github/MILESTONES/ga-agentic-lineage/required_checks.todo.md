# Required Checks Discovery — GA Agentic Lineage

## Discovery Steps (GitHub UI)

1. Open **Settings → Branches** for the `main` branch.
2. Select **Branch protection rules** and open the rule for `main`.
3. Capture the **Required status checks** list and paste the exact check names here.
4. Export the list to the milestone tracking doc and update any CI workflow names if needed.

## Temporary Gate Names (Current)

- `evidence-schema-validate`
- `evidence-index-validate`
- `agentic-lineage-required`
- `deps-delta-enforced`
- `osint-policy-lint`

## Rename Plan (Once Canonical Names Are Confirmed)

1. Update workflow job `name:` fields to match the required check names from GitHub.
2. Update `.github/required-checks.yml` (if used) with the canonical names.
3. Commit a dedicated “check rename” patch to keep history clean.
4. Re-run the branch protection audit workflow to confirm alignment.
