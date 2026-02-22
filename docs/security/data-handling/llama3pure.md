# GGUF Reference Mode Data Handling Policy

## Classification

- **Sensitive by default**: prompts, system prompts, model paths, and model files.
- **Restricted**: raw GGUF file contents and any sampled tokens.

## Never-Log List

The following must never appear in logs or artifacts:

- Raw prompt text or system prompts.
- Sampled tokens or model outputs.
- Raw GGUF file contents.
- Absolute file paths that reveal sensitive storage locations.

## Artifact Rules

- Artifacts store **hashes and lengths**, not raw text.
- Paths are recorded as **path hashes** only.
- Reports must remain deterministic and omit timestamps.

## Retention

- Retain only deterministic artifacts required for evidence and policy audits.
- Delete any transient parsing buffers immediately after inspection completes.

## Enforcement

- Policy gates must fail closed if data-handling constraints cannot be enforced.
- Any exception requires a documented **Governed Exception** with rollback criteria.
