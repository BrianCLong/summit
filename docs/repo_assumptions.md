# Repo Reality Check — Distributed RL Subsumption

## Verified
- MIT license.
- Top-level dirs present: .ci, .github, ai, ai-ml-suite, agents, agentops,
  artifacts/agent-runs, SECURITY, RUNBOOKS.

## Assumed (validate)
- Python is acceptable under ai-ml-suite/ (tooling, lint, tests).
- CI has a Python test lane we can extend.
- Artifact conventions allow deterministic JSON outputs.

## Must-not-touch (until verified)
- Any production deployment workflows under .github/workflows/
- Security policy enforcement under SECURITY/ and .security/
- Branch protection / required checks policy files (if present)

(Verification anchors: update this file with exact CI check names, lint rules,
and artifact conventions once locally inspected.)
