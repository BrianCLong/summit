# AI Psych Safety Trust Pack Standard

## Purpose
Establish a Summit policy pack that detects trust and psychological safety risk signals in
human–AI workflows, with deterministic and machine-verifiable evidence outputs.

## Scope
This standard defines inputs, outputs, evidence identifiers, and non-goals for the
`ai-psych-safety-trust` pack. It does not define HR processes or individual psychological
measurement.

## Inputs

| Input | Type | Description |
| --- | --- | --- |
| `ai_used` | boolean | Whether AI assistance was used in the workflow. |
| `ai_tool` | string | Identifier for the AI tool or model used. |
| `disclosure_mode` | enum | Disclosure metadata (e.g., `explicit`, `implicit`, `none`). |
| `review_events` | array | Review actions such as `flagged_error`, `accepted_suggestion`, `requested_human_review`. |
| `human_only_retro_id` | string | Identifier for a human-only retro artifact when present. |
| `actions_logged` | object | Categorized actions (e.g., `team_dynamics`, `tooling`, `training`). |

## Outputs

| Output | Path | Description |
| --- | --- | --- |
| Report | `artifacts/ai-psych-safety-trust/report.json` | Deterministic narrative findings. |
| Metrics | `artifacts/ai-psych-safety-trust/metrics.json` | Scored checks, counts, and statuses. |
| Stamp | `artifacts/ai-psych-safety-trust/stamp.json` | Versions and evidence identifiers only (no timestamps). |

## Evidence ID Pattern

```
EVIDENCE_ID = "SPS-" + <slug> + "-" + <check_id> + "-" + <fixture_or_run_id>
```

Example:

```
SPS-ai-psych-safety-trust-ERRCATCH-fixture01
```

## Checks (MWS)

| Check ID | Description | Expected Signal |
| --- | --- | --- |
| `ERRCATCH_REWARDED` | Error-catching celebration rubric | Triggers when reviewers flag AI mistakes. |
| `DISCLOSURE_PRESENT` | AI use disclosure metadata | Warns when AI use lacks disclosure. |
| `HUMAN_ONLY_RETRO_PRESENT` | Human-only retro artifact | Warns when missing. |
| `MISFRAMING_RISK` | Tech-only response pattern | Warns when only tooling/training actions are recorded. |

## Import/Export Matrix

**Imports**
- Summit run metadata: `ai_used`, `ai_tool`, `disclosure_mode`.
- Review events: `flagged_error`, `accepted_suggestion`, `requested_human_review`.
- Retro artifact presence: `human_only_retro_id`.

**Exports**
- `report.json`: deterministic narrative findings.
- `metrics.json`: machine-scored checks.
- `stamp.json`: versions and evidence IDs only.

## Non-goals
- Measuring individual psychology.
- Replacing HR processes.
- Blocking merges in the MWS phase (WARN-only by default).

## Determinism Requirements
- Stable key ordering for JSON outputs.
- No wall-clock timestamps in artifacts.
- Evidence IDs must be reproducible for a given fixture/run ID.
