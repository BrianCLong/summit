# Runbook: DeR2 Sandbox Benchmark

## Purpose

Run DeR2-style benchmark regimes to isolate retrieval loss vs reasoning loss with deterministic,
frozen libraries.

## Add a Frozen Library

1. Create a directory with `documents.jsonl`.
2. Ensure each line contains `{id, title, text}`.
3. Store outside logs and ensure access controls match data classification.

## Run Smoke vs Full

### Smoke (synthetic fixtures)

```
summit eval der2_smoke --model dummy
```

Artifacts written to `artifacts/der2_smoke/`.

### Full (BYO library)

```
summit eval der2 \
  --frozen_library_dir /path/to/frozen_library \
  --tasks /path/to/tasks.jsonl \
  --concepts /path/to/concepts.jsonl \
  --model dummy
```

## Interpret Metrics

- `regime_gap.full_set_minus_instruction_only` quantifies retrieval + reasoning gain.
- `error_attribution.json` flags mode-switch fragility and concept misuse.

## Reproduce a Run

1. Read `stamp.json` for input hashes and regimes.
2. Use identical frozen library + tasks + concepts.
3. Re-run with the same `bench_id` and regimes.

## Observability

- Emit `metrics.json` to Summit observability where supported.
- Otherwise retain artifacts only; logs must not contain document text.
