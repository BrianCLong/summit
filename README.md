# Summit Monorepo

This is the root README for the Summit project.

## CI Evidence & Guardrails
- Trajectory Golden‑Set: `npm run validate:trajectory` → emits JUnit + JSON + Markdown under `reports/`
- Grounding Verifier: `npm run validate:grounding` → emits SARIF + JSON + Markdown under `reports/`
- Canary Gate: consumes `evidence/slo/*.json` and `evidence/cost/*.json` (produced by your observability jobs) to enforce tripwires in CI.

### Badges
[![CI](https://github.com/<org>/<repo>/actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
![Trajectory Gate](https://img.shields.io/badge/trajectory-%E2%89%A5%2095%25-green)
![Grounding Gate](https://img.shields.io/badge/grounding-%E2%89%A5%2090%25-green)

### What the CI Gates Enforce
- **Trajectory Golden‑Set**: ReAct trace invariants; JUnit + JSON + Markdown evidence.
- **Grounding Verifier**: citation presence (URL + quote), SARIF in Code Scanning.
- **Canary Gate (pre‑deploy)**: blocks when error‑budget remaining < 60%, replica lag > 60s, or cost > 80% of budget.

### Evidence Artifacts
- `reports/junit-trajectory.xml`, `reports/trajectory-report.json`, `reports/trajectory-summary.md`
- `reports/grounding.sarif`, `reports/grounding-report.json`, `reports/grounding-summary.md`
- Optional: `evidence/slo/*.json`, `evidence/cost/*.json` consumed by canary gate