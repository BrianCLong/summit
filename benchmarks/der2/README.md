# DeR2 Sandbox Benchmark (Summit)

## Purpose

Summit’s DeR2 sandbox is a controlled, reproducible evaluation suite that decouples evidence access
from reasoning. It implements four regimes—Instruction-only, Concepts, Related-only, Full-set—to
separate retrieval loss from reasoning loss while keeping evidence frozen and deterministic.

## Files

- `regimes.py`: compile regime-specific prompts and evidence bundles.
- `runner.py`: run evaluation and emit deterministic artifacts.
- `schemas/`: JSONSchema for report, metrics, and stamp artifacts.
- `fixtures/`: synthetic mini-corpus and tasks for smoke runs.

## Regimes

| Regime | Evidence Inputs |
| ------ | --------------- |
| `instruction_only` | Question only, no concepts, no documents |
| `concepts` | Question + expert concepts |
| `related_only` | Question + related documents |
| `full_set` | Question + related documents + deterministic distractors |

## Frozen Library Layout

```
frozen_library_dir/
  documents.jsonl
```

Each JSONL row:

```json
{"id":"doc-1","title":"Doc Title","text":"Document text..."}
```

## Task + Concept Layout

```
tasks.jsonl
concepts.jsonl
```

`tasks.jsonl` row:

```json
{"id":"task-1","question":"...","expected_answer":"...","related_doc_ids":["doc-1"],"novelty_required":true}
```

`concepts.jsonl` row:

```json
{"task_id":"task-1","concepts":["Concept A","Concept B"],"rationale":"Optional"}
```

## Determinism

- Seeds derived from `bench_id` + `task_id`.
- JSON outputs are sorted with `sort_keys=True`.
- `stamp.json` uses hashes only (no timestamps).

## Reference

See the Summit Readiness Assertion for governance alignment and readiness posture.

