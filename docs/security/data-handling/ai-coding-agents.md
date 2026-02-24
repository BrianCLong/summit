# AI Coding Agents Data Handling

## Classification

- Agent-generated code and diffs are treated as untrusted engineering inputs.
- Evaluation artifacts are controlled governance metadata.

## Never Log

- Raw prompts.
- Secrets, API keys, credentials.
- Full datasets or customer content.

## Allowed Logging

- `prompt_hash`
- `input_hash`
- `output_hash`
- `evaluation_score`
- `evidence_id`

## Retention

- Hash and score metadata retention: 30 days.
- Drift report retention follows CI artifact defaults.

## Controls

- Enforce schema contract: `evidence/agent_output.schema.json`.
- Keep deterministic artifacts free of timestamps and runtime randomness.
- Feature flag default off: `SUMMIT_AGENT_GATES=false`.

