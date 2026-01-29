# CI Verifier Spec — FEWSHOT5X

## Required checks
- [ ] validate-release-policy
- [ ] lint-reason-codes
- [ ] security-scan
- [ ] sbom

## Summit gates
1) summit/evidence
- Command: `python3 -m evidence.validate --latest`
- Validates schemas + index mapping.

2) summit/agentic_eval_smoke
- Command: `python3 evals/agentic_coding/harness.py --suite smoke`
- Produces evidence artifacts.

## Evidence outputs (per run)
- evidence/fewshot5x-agentic-coding/EVD-FEWSHOT5X-EVAL-001/report.json
- evidence/fewshot5x-agentic-coding/EVD-FEWSHOT5X-EVAL-001/metrics.json
- evidence/fewshot5x-agentic-coding/EVD-FEWSHOT5X-EVAL-001/stamp.json
- evidence/index.json (updated)
