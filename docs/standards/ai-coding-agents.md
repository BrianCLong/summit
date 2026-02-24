# AI Coding Agents Standard

## Purpose

Establish Summit's trust-boundary controls for AI-generated code artifacts.

## MAESTRO Mapping

- MAESTRO Layers: Agents, Tools, Observability, Security.
- Threats Considered: hallucinated code, prompt injection, nondeterministic output, sensitive data leakage.
- Mitigations: deterministic evaluation harness, provenance schema, CI verification gate, drift monitor.

## Import/Export Matrix

| Surface | Type | Contract |
| --- | --- | --- |
| Import | Agent artifact | Source file under review (code, patch, diff). |
| Import | Prompt metadata | `prompt_hash` only; raw prompts excluded. |
| Export | Evaluation report | `report.json` with required evidence identity and hashes. |
| Export | Metrics | `metrics.json` with deterministic score and drift-compatible fields. |
| Export | Stamp | `stamp.json` with hash-only execution stamp and no timestamps. |
| Export | Schema | `evidence/agent_output.schema.json` machine-verifiable contract. |

## Requirements

- Agent outputs are untrusted by default.
- `report.json`, `metrics.json`, and `stamp.json` must be deterministic.
- Required fields: `evidence_id`, `agent_model`, `prompt_hash`, `input_hash`, `output_hash`, `evaluation_score`.
- CI must fail on missing evidence ID, missing evaluation report, or hash mismatch.
- Feature flag default remains off: `SUMMIT_AGENT_GATES=false`.

## Clean-Room Reimplementation Policy

- Evaluation logic must remain deterministic and side-effect free.
- No dependency on provider-specific runtime state.
- No use of wall-clock time or random values in evaluation artifacts.

## Non-Goals

- Building a first-party coding model.
- Replacing existing CI.
- Storing raw prompts or sensitive source material in logs.

