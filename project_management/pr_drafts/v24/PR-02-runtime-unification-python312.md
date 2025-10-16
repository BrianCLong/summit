# PR 2 — Runtime Unification (Docker sweep, part 2)

Title: feat(runtime): upgrade Python to 3.12 (services/workers)

Why: EOL avoidance, perf, security.

Scope: Replace `python:3.9*-slim*` → `python:3.12-slim` where used.

Files (examples):

- active-measures-module/Dockerfile
- deescalation-coach/infra/Dockerfile
- api/Dockerfile

Patch command:

```bash
rg -l "^FROM\s+python:3\.9" | while read f; do gsed -i 's/^FROM\s\+python:3\.9[^ ]*/FROM python:3.12-slim/' "$f"; done
```

Test plan: pytest -q/uv run -m pytest where configured; Trivy clean; e2e smoke.

Canary/rollback: 10% rollout; abort on SLO breach.

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
