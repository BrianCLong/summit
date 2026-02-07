# Required checks discovery (TODO)
1. GitHub UI: Repo Settings -> Branches -> Branch protection rules -> Required status checks.
2. Record exact check names here (copy/paste).
3. Update workflows to emit matching job names; if renames required, do so in a dedicated PR.

Temporary gate names (to be renamed once discovered):
- intelgraph:k6-sse-latency
- intelgraph:template-registry-validate
- intelgraph:offline-kit-verify
- intelgraph:tools-policy
