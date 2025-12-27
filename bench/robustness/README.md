# Robustness Bench

This harness generates perturbed prompts, applies ablation grids, and reports quality/latency/cost trade-offs.

## Layout

- `inputs.py`: canonical tasks that stress different domains.
- `perturbations.py`: transformations applied to each task.
- `runner.py`: loads ablation configs, evaluates all perturbations, and emits run artifacts.
- `plotting.py`: builds the Pareto frontier chart.
- `output/`: run summaries, case-level traces, and plots.

## Usage

```bash
python -m bench.robustness.runner  # writes JSON + pareto_frontier.png under bench/robustness/output
```

Outputs include mean quality, p95 latency, and total cost per ablation. A Pareto plot highlights non-dominated ablations (bold edges).
