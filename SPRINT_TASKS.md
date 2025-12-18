# Sprint Task Breakdown

This document explodes the sprint prompts into concrete tasks, files, and function signatures.

---

## Prompt 1: Minimal Training Stack v0.1

**Agent:** Codex (ML Engineer)
**Goal:** Minimal, reproducible training stack for one small model.

### 1.1 Training Entrypoint
*   **File:** `ml/train.py`
*   **Signatures:**
    ```python
    def load_config(config_path: str) -> dict: ...
    def load_data(data_path: str, schema: dict) -> pd.DataFrame: ...
    def train_model(data: pd.DataFrame, config: dict) -> Any: ...
    def save_artifacts(model: Any, metrics: dict, config: dict, output_dir: str) -> None: ...
    def main() -> None: ...
    ```
*   **Details:** Uses `argparse` for CLI. Loads config from YAML. Sits in `ml/` root.

### 1.2 Configuration
*   **File:** `ml/config/train.classifier.yaml`
*   **Content:**
    ```yaml
    model:
      type: "logistic_regression" # or simple torch model
      hyperparameters:
        learning_rate: 0.01
    data:
      schema: "text_classification_v1"
    training:
      epochs: 5
      batch_size: 32
    ```

### 1.3 Sample Data
*   **File:** `ml/data/sample/train.classifier.sample.jsonl`
*   **Content:** 10-20 lines of JSONL data matching the schema.

### 1.4 Makefile
*   **File:** `Makefile` (Root or `ml/Makefile`)
*   **Task:** Add `train-classifier` target.
    ```makefile
    train-classifier:
        cd ml && python train.py --config config/train.classifier.yaml
    ```

### 1.5 Documentation
*   **File:** `docs/ml/training-classifier.md`

### 1.6 Unit Test
*   **File:** `ml/tests/test_train_config.py`
*   **Details:** Test `load_config` and `argparse` logic.

---

## Prompt 2: Eval Harness & Leaderboard

**Agent:** Codex (ML Engineer)
**Goal:** Eval harness, leaderboard artifact, and CI smoke test.

### 2.1 Eval Entrypoint
*   **File:** `ml/eval.py`
*   **Signatures:**
    ```python
    def load_model(run_id: str) -> Any: ...
    def evaluate(model: Any, validation_set: str) -> dict: ... # returns metrics
    def update_leaderboard(metrics: dict, model_name: str) -> None: ...
    def main() -> None: ...
    ```

### 2.2 Leaderboard Artifact
*   **File:** `reports/models/classifier/leaderboard.md` (or JSON)
*   **Details:** Table of run_id | accuracy | f1 | latency.

### 2.3 CI Configuration
*   **File:** `.github/workflows/ci-train-eval-smoke.yml`
*   **Details:** Job that runs `make train-classifier` then `make eval-classifier-smoke`.

### 2.4 Makefile Updates
*   **Task:** Add `eval-classifier` and `eval-classifier-smoke`.

### 2.5 Documentation
*   **File:** `docs/ml/eval-classifier.md`

---

## Prompt 3: IntelGraph Schema v1

**Agent:** Jules (Backend/Graph Engineer)
**Goal:** Minimal IntelGraph schema (Nodes/Edges) implementation.

### 3.1 Schema Definition
*   **File:** `server/src/intelgraph/schema.ts`
*   **Details:** Define TypeScript interfaces/types for Nodes (`User`, `Agent`, `Task`, `Run`, `Artifact`) and Edges (`depends_on`, `subtask_of`, `produced_by`, `consumed_by`, `initiated_by`).
*   **Signatures:**
    ```typescript
    export interface IGNode { id: string; type: string; ... }
    export interface TaskNode extends IGNode { ... }
    export const createEdge = (from: IGNode, to: IGNode, type: string) => ...
    ```

### 3.2 Seeding Script
*   **File:** `server/src/examples/ig_seed_graph.ts`
*   **Details:** Script to instantiate nodes and edges in memory (or DB if available) to validate schema.

### 3.3 Documentation
*   **File:** `docs/intelgraph/schema-v1.md`

### 3.4 Tests
*   **File:** `server/src/intelgraph/schema.test.ts`
*   **Details:** Validate types and edge constraints.

---

## Prompt 4: Maestro Plan -> Execute -> Log Pipeline

**Agent:** Jules (Orchestration Engineer)
**Goal:** v0.1 Maestro pipeline with cost tracking.

### 4.1 Core Pipeline
*   **File:** `server/src/maestro/core.ts`
*   **Signatures:**
    ```typescript
    export async function planRequest(userId: string, requestText: string): Promise<Task[]> { ... }
    export async function executeTask(taskId: string): Promise<Artifact> { ... }
    export async function logResult(runId: string, taskId: string, artifact: Artifact, cost: CostInfo): Promise<void> { ... }
    ```

### 4.2 Cost Meter
*   **File:** `server/src/maestro/cost_meter.ts`
*   **Signatures:**
    ```typescript
    export class CostMeter {
      track(tokensIn: number, tokensOut: number, model: string): void;
      getRunCost(runId: string): number;
    }
    ```

### 4.3 CLI / Entrypoint
*   **File:** `server/src/scripts/maestro-run.ts`
*   **Details:** Wrapper to invoke `planRequest` -> `executeTask` loop.

### 4.4 Tests
*   **File:** `server/src/maestro/core.test.ts`

---

## Prompt 5: Green Baseline CI & Merge Train

**Agent:** Claude (CI Guardian)
**Goal:** Enforce green baseline, merge train, fast-lane.

### 5.1 CI Baseline Workflow
*   **File:** `.github/workflows/ci-green-baseline.yml`
*   **Details:** Lint, Test, Build. Required for all PRs.

### 5.2 Merge Train Logic
*   **File:** `scripts/ci/merge_train_manager.sh` (or .github workflow)
*   **Details:** Logic to handle queueing (mock or real if using GH actions features).

### 5.3 Fast Lane Logic
*   **File:** `.github/workflows/fast-lane-check.yml`
*   **Details:** Check if changes are only in `docs/` or `*.md` and skip heavy tests.

### 5.4 Documentation
*   **File:** `docs/engineering/ci-baseline.md`

---

## Prompt 6: CI Observability & Weekly Report

**Agent:** Claude (DevOps)
**Goal:** Instrument CI and generate weekly reports.

### 6.1 Report Generator
*   **File:** `scripts/ci/generate_weekly_report.py`
*   **Signatures:**
    ```python
    def fetch_workflow_runs(days: int) -> list: ...
    def aggregate_stats(runs: list) -> dict: ...
    def generate_markdown(stats: dict) -> str: ...
    ```

### 6.2 Data Storage (Simple)
*   **File:** `reports/ci/data/runs.jsonl` (Append-only log of runs, populated by CI step).

### 6.3 CI Hook
*   **File:** `.github/workflows/ci-report-generator.yml`
*   **Details:** Scheduled cron job (weekly).

---

## Prompt 7: Maestro Run Console UI

**Agent:** Gemini (UI/UX Engineer)
**Goal:** Vertical slice of UI for Maestro runs.

### 7.1 Page Component
*   **File:** `apps/web/src/pages/MaestroRunConsole.tsx`
*   **Details:** React component with Input, List of Tasks (Status), Details View.

### 7.2 API Client
*   **File:** `apps/web/src/api/maestro.ts`
*   **Signatures:**
    ```typescript
    export const startRun = (request: string) => ...
    export const getRunStatus = (runId: string) => ...
    ```

### 7.3 Docs
*   **File:** `docs/ui/maestro-run-console.md`

---

## Prompt 8: Onboarding & Role Registry

**Agent:** Claude (Docs Engineer)
**Goal:** Quickstart guide and Agent Role Registry.

### 8.1 Quickstart
*   **File:** `docs/contributing/quickstart.md`
*   **Details:** "0 to 1" guide for new devs.

### 8.2 Role Registry
*   **File:** `docs/agents/roles.md`
*   **Details:** Canonical prompts for Architect, CI Guardian, Model Trainer, UI Engineer.

### 8.3 Index
*   **File:** `docs/INDEX.md`
