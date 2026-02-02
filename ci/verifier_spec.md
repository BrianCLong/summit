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

7) summit/graph-integrity
- Command: `python3 -m summit.ci.graph_integrity --validate`
- Tests: malformed updates rejected; reconciliation proof artifacts logged.

8) summit/appeals
- Command: `python3 -m summit.ci.appeals --re-evaluate`
- Tests: appealed decisions re-evaluated deterministically; overrides require approvals.

9) summit/causal-guardrails
- Command: `python3 -m summit.ci.causal_guardrails --check`
- Tests: lift estimate requires assumptions artifact; stale estimates rejected.

## Defense IP Claims Verification (CRM & Simulation)
1) **Rule provenance tests:**
   - Verify each policy decision includes rule IDs.
   - Verify rule provenance metadata (author, approval, date) is present.
2) **Approval credential tests:**
   - Verify revoked credentials result in denial.
   - Verify step-up authentication is required for high-risk actions.
3) **Poisoning tests:**
   - Verify suspicious source drift triggers quarantine.
   - Verify external publish is denied for quarantined sources.
4) **Consensus tests:**
   - Verify high disagreement among models leads to monitoring-only mode.
5) **Semantic canary tests:**
   - Verify unsafe semantics triggers modification or denial.
   - Verify canary rollback rules are enforced.
6) **DR/COOP tests:**
   - Verify audit unavailability triggers denial of external publishing.
   - Verify recovery proof artifact is required after failover.