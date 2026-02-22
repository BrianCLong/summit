# Required checks discovery (TODO)
1) GitHub UI: Repo Settings -> Branches -> Branch protection rules -> Required status checks.
2) GitHub API:
   - List workflows: /actions/workflows
   - Inspect check runs: /commits/{sha}/check-runs
Record exact check names here and update ci/gates/compfeat_gates.yml accordingly.
