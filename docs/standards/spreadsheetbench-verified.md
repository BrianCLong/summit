# SpreadsheetBench Verified integration (Summit)

## Readiness assertion

This standard aligns with the Summit Readiness Assertion and preserves the Law of Consistency for evidence-first benchmark operations. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authority baseline.

## Purpose

Define the Summit integration contract for SpreadsheetBench Verified-style spreadsheet tasks with deterministic, auditable evidence artifacts and CI-ready scoring.

## Scope

* Benchmark definition, loader expectations, and scoring rules for Verified (400) tasks.
* Evidence-first reporting and deterministic artifact layout for repeatable scoring.
* Linux-first execution with governed, deny-by-default spreadsheet sandboxing.

## Non-goals

* Excel macro execution or external link resolution.
* Claims of parity with upstream Excel recalculation unless explicitly validated.
* Dataset vendoring by default.

## Attribution & license

SpreadsheetBench is licensed under CC BY-SA 4.0. Summit integrates via external dataset fetches and maintains attribution in documentation. Summit code remains original and does not vendor dataset files by default.

## Benchmark facts (grounded)

* SpreadsheetBench Verified is a 400-task subset.
* SpreadsheetBench is built from 912 real spreadsheet questions with an online-judge-style evaluation metric.
* Leaderboard submissions require an API that generates agent results.

## Evidence layout (deterministic)

* Evidence ID prefix: `EV-SSB-`.
* Stable task ordering: order by manifest index or explicit task ID.
* Deterministic artifacts: no wall-clock timestamps in `metrics.json` or `stamp.json`.

### Artifact outputs

* `report.json`: run metadata, config flags, dataset version and hash.
* `metrics.json`: pass@1 and breakdowns.
* `stamp.json`: deterministic stamp, dataset version, engine versions.
* `evidence/EV-SSB-000001/`: per-task evidence bundle (hashes, diffs, logs).

## Import/Export matrix

### Import

* Manifest-driven task list (JSONL or JSON) describing instruction + workbook paths.
* Dataset fetched externally into the Summit cache (no dataset vendoring).

### Export

* `report.json`, `metrics.json`, `stamp.json`.
* `evidence/*` with workbook hashes, applied edits, sandbox logs, and policy outcomes.

## Determinism requirements

* Fixed random seed and stable task ordering.
* Hash-based identity for workbooks and evidence bundles.
* No timestamps in deterministic artifacts (only logs may include timestamps).

## Governance alignment

* All regulatory logic expressed as policy-as-code.
* Policy exceptions are tracked as Governed Exceptions.
* Evidence must be attached for any run that influences release gates.

## MAESTRO threat-model alignment

* **MAESTRO Layers**: Data, Agents, Tools, Infra, Observability, Security.
* **Threats Considered**: malicious spreadsheet content, prompt injection via cell text, tool abuse in spreadsheet engines.
* **Mitigations**: deny-by-default sandbox, external link blocking, sanitized prompts, no network, per-task timeouts, evidence-first logging.

## Summit integration checklist

1. Define the SpreadsheetBench Verified manifest and loader.
2. Implement a Linux-first sandbox runner with deny-by-default execution.
3. Emit deterministic evidence artifacts for every task.
4. Implement pass@1 scoring and stable reports.
5. Add CI smoke target (20 tasks) with budgets and artifact retention.

## Change classification

This benchmark integration is a `minor` change until the runner touches production systems or policy gates.
