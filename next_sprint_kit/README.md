# Next Sprint Kit — IntelGraph Advisory

This kit assembles sprint planning collateral, engineering specs, runbooks, tests, diagrams, and reproducible demo data for the NL→Cypher preview, provenance ledger beta, and cost guard controls.

## Contents
- `sprint_goal.md`: Sprint objective and success metrics.
- `epics.yaml`: Five epics with priorities and acceptance.
- `stories.csv`: Importable backlog of 14 stories with ACs and points.
- `okrs.md`: Objectives and measurable key results.
- `risk_matrix.md`: Top risks, triggers, and contingencies.
- `spec/`: Authority compiler, NL→Cypher preview, and provenance ledger specs.
- `ops/slo_dashboards.md`: Dashboard layout and JSON hook guidance.
- `finops/cost_guard.md`: Cost guard architecture and KPIs.
- `runbooks/`: R1, R2, R3, and R9 runbooks with KPIs, failure modes, and XAI notes.
- `tests/`: E2E and k6 load plans.
- `chaos/experiments.md`: Chaos drill scenarios and expectations.
- `diagrams/`: Mermaid diagrams for tri-pane UX and data lineage.
- `scripts/generate_demo_data.py`: Deterministic fixture generator; run with `--verify` for checksums.

## Quickstart
```bash
python scripts/generate_demo_data.py --seed 42 --verify
```
Generated fixtures live in `next_sprint_kit/demo_data` and power the runbooks and test plans.
