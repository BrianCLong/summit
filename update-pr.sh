#!/bin/bash
export GH_TOKEN="${GITHUB_TOKEN:-$GH_TOKEN}"
PR_BODY="chore: fix CI failures preventing GA rollout

- Removed duplicate pnpm versions across workflows to avoid \`ERR_PNPM_BAD_PM_VERSION\`
- Added condition to only run setup-gcloud/aws/azure if secrets exist in parity check
- Updated node-version to 20 for multiple CI workflows (including provenance-verify)
- Updated \`gates.yml\` to point to the correct \`.md\` extension for \`evidence-map\`
- Removed lowercase \`dependency_delta.md\` files causing case collision failures

## Assumption Ledger
- We assume that updating the Node.js version to 20 for GitHub Actions workflows is a safe operation that will not break other things, since it seems to be the standard version in other workflows.
- We assume that missing OIDC and cloud secrets shouldn't block the parity check workflows for other cloud providers that are configured properly or when they are not explicitly required for standard checks without secrets.
- We assume that removing the lowercased dependency_delta files is safe and they were accidentally committed due to a case-insensitive file system issue.

## Diff Budget
- Minimal workflow YAML adjustments.
- Small bash script corrections.
- About 15 lines of code modified/deleted.

## Success Criteria
- The CI pipeline runs successfully without \`ERR_PNPM_BAD_PM_VERSION\`.
- The CI pipeline runs successfully without missing Cloud provider authentication if their secrets are not provided.
- The CI pipeline executes the node scripts properly using Node 20.
- The CI gates pass after locating the \`evidence-map.md\` correctly.

## Evidence Summary
- The build-and-verify workflow, gates workflow, parity-check workflow, and verify-provenance workflow should all pass after this.
- Case collision checks pass locally.

<!-- AGENT-METADATA:START -->
{
  \"promptId\": \"fix-ci-failures\",
  \"taskId\": \"17979263019487401694\",
  \"tags\": [\"ci\", \"github-actions\", \"fix\"]
}
<!-- AGENT-METADATA:END -->
"

gh pr edit 18877 --body "$PR_BODY"
