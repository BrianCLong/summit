# Runbook: Decentralized AI Assurance Lane

## SLO

- 99% deterministic CI pass rate for decentralized AI assurance checks.

## Alerting

- Trigger alert when drift score increases by more than 10% relative to baseline.

## Triage Steps

1. Verify baseline and current metrics files are valid and deterministic.
2. Re-run drift detector locally.
3. Confirm whether concentration changes are expected (planned migration) or anomalous.
4. If false positive, update baseline with evidence in change notes.

## Rollback

- Disable pipeline usage through `ENABLE_DAI_SUBSUMPTION=False`.
- Revert `pipelines/decentralized_ai_pipeline.py` integration points.
