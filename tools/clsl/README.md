# Content Laundering Stress Lab (CLSL)

The Content Laundering Stress Lab (`clsl`) is a lightweight Python harness for
stress testing watermark and provenance detectors against laundering
transformations such as transcoding, cropping, paraphrasing, OCR pivots, and
re-scans.  It produces deterministic survival summaries, ROC statistics, and
hardening comparisons for multiple detector configurations.

## Features

- Text-only reference dataset with ground-truth labels for watermark and
  provenance signals.
- Deterministic laundering transforms that emit concrete artifacts under
  per-level output directories.
- Simple keyword and manifest-backed detectors whose thresholds can be toggled
  to simulate hardening.
- JSON and CSV reporting with ROC points and survival breakpoints for each run.
- TypeScript helper for invoking the harness from CI pipelines.

## Layout

```text
clsl/              # Python package (harness code)
configs/           # Example configuration
sample_data/       # Tiny corpus + claims file
run.ts             # TypeScript helper entrypoint
requirements.txt   # Python dependencies (pytest for tests)
```

## Quick Start

1. **Install dependencies**

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r tools/clsl/requirements.txt
   ```

2. **Run the sample pipeline**

   ```bash
   PYTHONPATH=tools/clsl python -m clsl.cli run --config tools/clsl/configs/sample.json
   ```

   Reports are written to `tools/clsl/sample_data/out` by default:

   - `summary.json` — survival overview per run and detector.
   - `results_baseline.json` / `results_hardened.json` — raw per-artifact scores.
   - `roc_*.json` — ROC curve points.
   - `results.csv` — flattened table suitable for spreadsheets.

3. **Call from TypeScript**

   ```bash
   pnpm ts-node tools/clsl/run.ts --config tools/clsl/configs/sample.json
   ```

   The helper wires up `PYTHONPATH`, executes the pipeline, and prints a compact
   digest that includes a stable hash of the generated reports.

## Extending

- Add new laundering logic by implementing `BaseTransform` subclasses in
  `clsl/transforms.py`.
- Create alternative detector heuristics in `clsl/detectors.py` and reference
  them from configuration files.
- Duplicate the sample configuration and adjust transform levels or detector
  thresholds to explore new scenarios.

## Testing

```bash
PYTHONPATH=tools/clsl pytest tools/clsl/tests -q
```

The reference tests exercise the CLI, ensure deterministic ROC output, and
validate that detector hardening improves survival breakpoints.
