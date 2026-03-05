# Required Check Discovery

## Goal
Discover existing required checks via the GitHub API to ensure that branch protection rules are satisfied before merging Agent Runtime PRs.

## Instructions
1. Query the GitHub repository for required status checks using the API.
   Example: `gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks`
2. Update this document with the names of the required checks.
3. Ensure that `.github/workflows/ci-agent-runtime.yml` integrates with or provides all necessary success/shim jobs to satisfy these required checks.
