# Pipeline Flakiness Detector (PFD)

PFD is a lightweight toolkit for characterising pipeline non-determinism. It repeatedly
executes each step of a pipeline on identical inputs and seeds, estimates per-step
variance, and reports a flakiness score that highlights the most unstable components.

## Features

- Deterministic orchestration that seeds common RNGs before each run.
- Statistical summaries per step (difference ratio, variance, failure rate).
- HTML reporting that includes blame file/line information for each step.
- Pytest integration via the `pfd_session` fixture and CLI flags.

## Usage

```python
from pfd import PipelineFlakinessDetector, PipelineStep

steps = [
    PipelineStep("load", load_data),
    PipelineStep("transform", transform_data),
]

detector = PipelineFlakinessDetector(steps, runs=10, seed=123)
analyses = detector.run(initial_input=None)
```

Generate a report:

```python
from pfd import HTMLReportBuilder

builder = HTMLReportBuilder(analyses, runs=detector.runs, threshold=detector.threshold)
builder.to_file("pfd-report.html")
```

### Pytest plugin

Enable the pytest plugin by installing the package in your environment and running
pytest with the provided fixture:

```python
def test_pipeline(pfd_session):
    steps = [PipelineStep("step", lambda x: x)]
    pfd_session.run_pipeline(steps, initial_input=None, name="pipeline")
```

Command line options:

- `--pfd-runs` (default 5)
- `--pfd-threshold` (default 0.2)
- `--pfd-report` (default `pfd-report.html`)
