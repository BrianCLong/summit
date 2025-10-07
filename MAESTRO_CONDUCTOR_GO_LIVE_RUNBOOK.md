## Runbook Auto‑Generation

Runbooks are regenerated on each merge to `main` using `scripts/generate_runbooks.py` fed by CI events and Maestro run logs.

**Sources**: GitHub Actions, Maestro Conductor events, OPA decision logs, tracing (OTel).

**Command**:

```bash
python scripts/generate_runbooks.py --since $LAST_RELEASE_TAG --out docs/runbooks/
```

## Fast‑Lane Gate

Release gates accept an additional artifact `fastlane.ok`. When present and valid, human checkpoint is skipped for pre‑approved step‑ups per policy.
