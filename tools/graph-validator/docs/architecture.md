# Architecture

## Components

1.  **LogBinSketch**: Approximates the degree distribution using logarithmically spaced bins. This allows for constant space usage regardless of the number of observations.
2.  **KS Distance**: Computes the Kolmogorov-Smirnov distance between two sketches to quantify the drift.
3.  **DriftDetector**: Compares the KS distance against configured thresholds (D and p-value) to determine if drift has occurred.
4.  **EvidenceGenerator**: Produces deterministic, verifiable artifacts (`report.json`, `metrics.json`, `stamp.json`).

## Data Flow

`Degree Stream (JSONL)` -> `Sketch` -> `KS Distance` -> `Drift Check` -> `Artifacts`
