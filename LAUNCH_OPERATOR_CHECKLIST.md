# 🚀 Summit GA Launch Operator Checklist

This checklist is the definitive guide for the operator managing the Summit GA launch.

## Phase 1: Pre-Deploy Finality (T minus 1h)
- [ ] **Evidence Gate**: Verify `evidence-bundle.tar.gz` is present and checksummed.
- [ ] **Config Audit**: Ensure `NODE_ENV=production` and `ENABLE_INSECURE_DEV_AUTH=false`.
- [ ] **Dependency Lock**: Confirm all containers are using immutable digests (not `latest`).
- [ ] **On-Call Handover**: SRE team notified and dashboard links shared.

## Phase 2: Post-Deploy Verification (T plus 15m)
- [ ] **Run Validation Script**: 
  ```bash
  node scripts/validate-summit-deploy.mjs
  ```
- [ ] **Go/No-Go Decision**: If RED, follow [Rollback Runbook](docs/runbooks/rollback-procedure.md).
- [ ] **Traffic Entry**: Enable external ingress (Gateway v1.3.0+).

## Phase 3: Immediate Observation (T plus 1h)
- [ ] **Regression Detection**: Run the early-life regression check:
  ```bash
  node scripts/detect-ga-regressions.mjs
  ```
- [ ] **Error Rate**: Check [Production SLO Dashboard](http://localhost:3001/d/production-slo).
- [ ] **Queue Depth**: Monitor `ingest` and `evidence` queues in [Maestro Dash](http://localhost:3001/d/maestro-production).
- [ ] **NLU Accuracy**: Spot-check first 10 user queries for `nl2cypher` correctness.

## Phase 4: First-Day Stabilization (T plus 24h)
- [ ] **Feedback Aggregate**: Run the aggregator to check launch health:
  ```bash
  node scripts/ga-feedback-aggregator.mjs
  ```
- [ ] **Audit Trail**: Verify evidence ledger consistency via `GET /api/compliance/verify`.
- [ ] **Cost Check**: Review [FinOps Dashboard](http://localhost:3001/d/finops-dashboard) for token burn.
- [ ] **Incident Triage**: Follow the [4-Hour "Fast Path" Loop](RUNBOOKS/GA_LAUNCH_WEEK_ITERATION.md) for P0/P1 issues.

## Reference Links
- **Full Runbook**: [GA First-Week Operations](RUNBOOKS/GA_FIRST_WEEK_OPERATIONS.md)
- **Iteration Loop**: [GA Launch-Week Iteration](RUNBOOKS/GA_LAUNCH_WEEK_ITERATION.md)
- **Feedback Map**: [GA Feedback Loops](GA_FEEDBACK_LOOPS.md)
- **Rollback Procedure**: [docs/runbooks/rollback-procedure.md](docs/runbooks/rollback-procedure.md)
- **Emergency Slack**: `#summit-ops`

**Operator Sign-off**: ____________________ | Date: ____________________
