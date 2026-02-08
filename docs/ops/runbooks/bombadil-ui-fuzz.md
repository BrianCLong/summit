# Runbook: Bombadil-Inspired UI Fuzz Probe

## Summit Readiness Assertion
This runbook operationalizes the Summit Readiness Assertion for deterministic UI fuzzing. See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness posture and evidence requirements.

## Purpose
Provide operational guidance for running, reproducing, and triaging UI fuzz probe results.

## When to Run
- CI smoke mode on PRs (timeboxed).
- Local reproduction of reported violations using the same seed.

## How to Reproduce Locally
1. Start the target UI locally (dev server).
2. Run the probe with a deterministic seed and allowlist.
3. Re-run with the same seed to confirm deterministic trace hash.

Example:

```bash
UI_FUZZ_BASE_URL=http://localhost:3000 \
UI_FUZZ_ALLOWLIST=localhost \
UI_FUZZ_SEED=7331 \
pnpm ui-fuzz:smoke
```

## Artifacts and Interpretation
- `report.json`: violation summary with minimal context.
- `metrics.json`: duration, actions, navigation counts, trace bytes.
- `stamp.json`: content hashes to prove determinism.
- `trace.ndjson` (optional): step-by-step trace for reproduction.

## Triage Checklist
- Confirm allowlist and base URL are correct.
- Check `stamp.json` hash matches on re-run with the same seed.
- Review `report.json` for violation type (console error, crash, idle timeout).
- Verify `metrics.json` for timebox or action cap exhaustion.

## Rollback / Disable
- Toggle the feature flag (default OFF).
- Disable the CI job (workflow toggle or PR label override).

## MAESTRO Threat Modeling (Required)
- **MAESTRO Layers**: Foundation, Data, Tools, Observability, Security.
- **Threats Considered**: goal manipulation via DOM, tool abuse through external navigation, sensitive data exposure.
- **Mitigations**: allowlist enforcement, redaction policy, deterministic bounds and timeboxing, artifact hashing.

## Monitoring & Drift
- Scheduled drift detector compares violation counts and determinism hashes.
- Alert on increased violations or determinism regressions.
- Drift detector entrypoint: `scripts/monitoring/bombadil-ui-fuzz-drift.ts`.
