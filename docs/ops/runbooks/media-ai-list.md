# MALE Runbook

## Overview
Instructions for operating the Media AI List Evaluator (MALE) pipeline.

## Enabling the Feature
The feature is disabled by default.
`export MEDIA_AI_LIST_ENABLED=true`

## Running the Pipeline (Manual)
```bash
python scripts/media_list/ingest.py --input "http://example.com/ai-tools" > parsed.json
python scripts/media_list/extract.py --input_json parsed.json --output intermediate.json --tools_out data/media_ai_lists/test_slug/tools.yaml
python scripts/media_list/map_evidence.py --input intermediate.json --output data/media_ai_lists/test_slug/evidence.json --slug test_slug
python scripts/media_list/score_governance.py --input data/media_ai_lists/test_slug/evidence.json --metrics_out reports/media_ai_lists/test_slug/metrics.json --flags_out reports/media_ai_lists/test_slug/policy_flags.json
python scripts/media_list/report.py --slug test_slug --evidence data/media_ai_lists/test_slug/evidence.json --metrics reports/media_ai_lists/test_slug/metrics.json --flags reports/media_ai_lists/test_slug/policy_flags.json --report_out reports/media_ai_lists/test_slug/report.json --stamp_out reports/media_ai_lists/test_slug/stamp.json --input_hash "sha256:0000"
```

## Drift Escalation
If the `media-list-drift.yml` workflow fails:
1. Review `trend.json` for the affected list.
2. Determine if the media source modified claims.
3. If valid, update the baseline report.

## Artifacts Note
Artifacts generated during intermediate execution (such as `parsed.json` and `intermediate.json`) should not be checked into the source tree. These are ignored by git.
