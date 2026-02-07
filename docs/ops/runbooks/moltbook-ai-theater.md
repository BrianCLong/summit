# Runbook: Moltbook-Class Agentic Platform Evaluation

## Purpose
Operate the fixture-only evaluation pack for Moltbook-class failures and interpret
CI gate outcomes.

## Preconditions
- Feature flag default OFF: `SUMMIT_AGENTIC_PLATFORM_EVAL=0`.
- Fixtures are synthetic-only under `tests/fixtures/moltbook_ai_theater/`.

## How to Run Locally
1. Run the evaluation profile against fixtures:
   - `summit eval agentic-platform --fixture moltbook-classic`
2. Verify deterministic artifacts exist:
   - `artifacts/moltbook-ai-theater/report.json`
   - `artifacts/moltbook-ai-theater/metrics.json`
   - `artifacts/moltbook-ai-theater/stamp.json`

## How to Interpret Failures
- **Secrets gate failure**: Indicates secrets-like strings present in public bundle.
- **Write-path gate failure**: Indicates missing auth or provenance evidence.
- **PII gate failure**: Indicates synthetic PII leakage or never-log list violation.
- **Provenance gate failure**: Indicates "AI-only" claims without required signals.

## Adding a New Fixture Safely
1. Use synthetic data only.
2. Ensure evidence IDs follow `EVID:<slug>:<category>:<nnnn>`.
3. Update fixture README with intent and expected failures.
4. Run deterministic artifact validation before commit.

## Alerting
- CI failure is the alert. No runtime pager is required.

## Reference Authority
See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness posture.
