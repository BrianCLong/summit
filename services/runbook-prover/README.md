# Runbook Prover Runtime

This prototype runtime executes declarative runbooks, records replayable logs, and emits proof bundles covering legal preconditions and KPI postconditions.

## Layout
- `runbook_prover/runbooks/`: Example runbooks for CTI rapid attribution and DFIR phishing cluster discovery.
- `runbook_prover/fixtures/`: Synthetic fixtures consumed by the runbooks.
- `runbook_prover/runs/`: Serialized run states for replay/resume.
- `runbook_prover/proofs/`: Generated proof bundles.
- `rbctl.py`: CLI entry point.

## Usage

```bash
python services/runbook-prover/rbctl.py run services/runbook-prover/runbook_prover/runbooks/rapid_attribution.yaml
python services/runbook-prover/rbctl.py replay --run <run_id>
python services/runbook-prover/rbctl.py verify --run <run_id>
```

The CLI supports `resume` (continues an incomplete run) and `list` (shows stored runs). Proof export is blocked and an ombuds review token added when preconditions or KPI gates fail.
