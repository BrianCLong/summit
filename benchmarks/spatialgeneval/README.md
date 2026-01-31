# SpatialGenEval Benchmark Adapter

Spatial intelligence benchmark adapter for the Summit platform. This implementation is based on the paper "Everything in Its Place: Benchmarking Spatial Intelligence of Text-to-Image Models".

## Overview

SpatialGenEval evaluates text-to-image models on their ability to accurately represent spatial relationships across 10 sub-domains and 25 scenes.

## Data Format

The benchmark uses a JSONL format for prompts and QA pairs.

### Prompt Record
```json
{"prompt_id": "P001", "scene": "living_room", "prompt_text": "A cat on a mat.", "subdomains": ["relative_position"]}
```

### QA Record
```json
{"question_id": "Q001", "prompt_id": "P001", "question": "Where is the cat?", "choices": ["On the mat", "Under the mat"], "answer_index": 0, "subdomain": "relative_position"}
```

## Operational Runbook

### 1. Preparation
- Ensure `SPATIALGENEVAL_ENABLED` is set to `true` in `manifest.json`.
- Place your generated images in a directory, named as `{prompt_id}.png`.

### 2. Execution
Run the evaluation using the runner:
```bash
python benchmarks/spatialgeneval/runner.py --images-dir /path/to/images --data-file /path/to/prompts.jsonl
```

### 3. Evidence
The runner will output:
- `evidence/spatialgeneval/report.json`
- `evidence/spatialgeneval/metrics.json`
- `evidence/spatialgeneval/stamp.json`

## Determinism
This benchmark enforces deterministic outputs. No timestamps are allowed in metrics or reports except in `stamp.json`.

## Governance
This benchmark is governed by the Summit Platform security and evidence gates.
