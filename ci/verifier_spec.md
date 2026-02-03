# CI Verifier Spec — FEWSHOT5X

## Required checks
- [ ] validate-release-policy
- [ ] lint-reason-codes
- [ ] security-scan
- [ ] sbom
- [ ] summit-influence-evidence
- [ ] summit-influence-evals
- [ ] summit-neverlog
- [ ] summit-supply-chain

## Summit gates
1) summit/evidence
- Command: `python3 -m evidence.validate --latest`
- Validates schemas + index mapping.

2) summit/agentic_eval_smoke
- Command: `python3 evals/agentic_coding/harness.py --suite smoke`
- Produces evidence artifacts.

3) summit/influence-evidence
- Command: `python3 -m summit.evidence.validate --item ai-influence-ops`
- Validates influence ops evidence bundle.

4) summit/influence-evals
- Command: `python3 -m summit.evals.influence_ops.runner`
- Runs deterministic influence ops eval suite.

5) summit/neverlog
- Command: `python3 -m summit.security.influence_ops.privacy --audit`
- Fails if forbidden fields appear in logs/traces.

6) summit/supply-chain
- Command: `python3 tools/ci/check_dependency_delta.py`
- Fails if deps change without documentation.

## Evidence outputs (per run)
- evidence/fewshot5x-agentic-coding/EVD-FEWSHOT5X-EVAL-001/report.json
- evidence/fewshot5x-agentic-coding/EVD-FEWSHOT5X-EVAL-001/metrics.json
- evidence/fewshot5x-agentic-coding/EVD-FEWSHOT5X-EVAL-001/stamp.json
- evidence/ai-influence-ops/EVD-ai-influence-ops-EVIDENCE-001/report.json
- evidence/index.json (updated)
