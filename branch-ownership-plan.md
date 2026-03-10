# Goal
"Jules, enforce branch naming conventions (feature/, fix/, chore/, governance/, etc.) and implement an ownership map (who owns which subsystem). Auto-tag PRs based on branch name and touched subsystems, and generate an ownership heatmap."

# Plan
1. Create a script (e.g., `scripts/governance/branch_ownership_enforcer.ts`) that:
   - Reads the PR branch name.
   - Enforces that it starts with a valid prefix: `feature/`, `fix/`, `chore/`, `governance/`, `docs/`, `refactor/`, `test/`.
   - Reads `CODEOWNERS` (or an internal map based on CODEOWNERS) to determine subsystem ownership for changed files.
   - Auto-labels the PR based on the branch name prefix (e.g., `type: feature`, `type: fix`).
   - Auto-labels the PR based on touched subsystems/owners (e.g., `owner: @team-ops`, `owner: @intelgraph-core`).
2. Implement a step in the GitHub workflow to generate an "ownership heatmap" report, which is a breakdown of which files/directories were touched and who owns them.
3. Integrate the script into a GitHub Workflow (e.g., `.github/workflows/branch-ownership.yml` or adding to an existing PR triage/gate workflow) that runs on `pull_request` (`opened`, `synchronize`, `reopened`).

# Execution details
- The script will need `octokit` or rely on `gh pr edit` to add labels. We can use github actions/github-script, but a TypeScript script run via `tsx` is standard in this repo.
- For the heatmap, we can output a markdown summary and append it to `$GITHUB_STEP_SUMMARY`.
