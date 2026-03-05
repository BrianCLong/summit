# Repository Assumptions for SWE-rebench Integration

* **Dataset Ingestion Location**: Expected to be in `datasets/swe-rebench/`.
* **Test Runner Architecture**: Containerized executor via `evaluation/swe/containerRunner.ts` and `evaluation/swe/runTask.ts`.
* **Container Runtime Approach**: Docker OCI images as specified by the dataset, providing reproducible environments.
* **Evaluation Result Schema**: JSON outputs containing `tests_passed_before`, `tests_passed_after`, `patch_success`, `runtime_seconds` (in `evaluation/results/<instance-id>/report.json` and `metrics.json`).
