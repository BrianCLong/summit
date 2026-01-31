# Agent Registry v0 Execution Prompt

## Objective

Deliver the Agent Registry v0 scaffolding: schema, loader, CLI validation, fixtures, tests, and documentation.

## Constraints

- Use deterministic ordering and stable defaults.
- Reject unknown fields in agent definitions.
- Keep dependencies minimal and consistent with repo conventions.
- Include tests and documentation alongside implementation.
- No network calls in tests.

## Outputs

- Registry YAML definitions under `docs/agents/registry/`.
- Loader library and validation utilities.
- CLI commands to list and validate registry entries.
- Unit tests covering happy path, schema validation, YAML errors, and duplicate IDs.
- Documentation describing registry usage and roadmap connections.
