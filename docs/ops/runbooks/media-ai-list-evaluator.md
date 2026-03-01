# Media AI List Evaluator Runbook

## Regeneration Instructions
To regenerate the deterministic report, run:
`python3 scripts/media_ai_list_evaluator/score.py <path_to_evidence_json> <output_dir>`

## CI Failure Playbook
If CI fails on determinism, check for:
1. Timestamp injection in output JSON
2. Non-deterministic sorting of dictionary keys
3. Hashing algorithm changes

**SLO:** 99% deterministic regeneration success.
