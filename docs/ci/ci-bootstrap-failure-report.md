# CI Bootstrap Failure Report
## Root Cause Analysis
The CI pipeline initialization is likely encountering missing or improperly structured workflows required for benchmarking and evidence generation.

## Fix Plan
Add the necessary files (`benchmark-required-checks.md`) and create a basic CI action `graphrag-benchmark.yml` that meets the minimum contract of outputs (metrics.json, report.json, stamp.json).
