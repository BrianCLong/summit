# Cognitive Resilience Module

## Overview
The `cog_resilience` module provides **aggregate** indicators for cognitive resilience (e.g., morale, cohesion, trust, decision friction) while strictly prohibiting offensive influence operations capabilities.

## Defensive Scope
This module is designed solely for **defensive measurement, detection, governance, and auditability**.
It maps threat signals to resilience metrics to identify vulnerabilities in social cohesion or decision-making processes without engaging in manipulation.

### Context
PLA "cognitive domain operations" framings emphasize influencing cognition (emotions, motivation, judgment, behavior) to achieve political aims (e.g., "subduing soldiers without war").
This module provides the **Defensive Cognitive-Influence Resilience & Measurement** capability to detect and quantify these risk signals.

## Governance & Prohibitions
To prevent dual-use drift, this module enforces a **deny-by-default** policy.

### Prohibited Intents
- `persuasion`
- `microtargeting`
- `psychographic_segmentation`
- `counter_messaging_automation`
- `narrative_shaping_playbook`
- `flooding_or_amplification_tactics`

### Prohibited Fields (Never Log)
- `individual_id`
- `device_id`
- `raw_handle`
- `psychographic_segment`
- `persona_target`
- `message_variant`
- `call_to_action`

## Data Model
The core data structure is the `AggregateIndicator`, which strictly forbids PII and granular targeting data.

```json
{
  "time_bucket": "2023-Q1",
  "region_bucket": "US-EAST",
  "indicator_type": "morale_proxy",
  "value": 0.8,
  "confidence": 0.9,
  "method": "survey_aggregate",
  "limits": "Sample size < 1000"
}
```

## Evidence & Evals
All changes to this module must pass the `ci/summit-cog-evals` gate.
- **Fixtures:** `evals/cog_resilience/fixtures.json` contains both positive (benign) and negative (prohibited) test cases.
- **Artifacts:**
  - `report.json`: Summary of validation runs.
  - `metrics.json`: Compliance metrics (e.g., `policy_blocks_total`).
  - `stamp.json`: Timestamp of the run.

## Audit
Audit logs are exported in JSONL format, containing only aggregate indicators. All prohibited fields are automatically redacted.
