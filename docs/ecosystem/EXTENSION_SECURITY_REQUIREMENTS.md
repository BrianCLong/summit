# Extension Security Requirements

## Required Security Declarations

All extension manifests must declare their required permissions as a self-attestation:

- `extension.json` must include a `permissions` array (can be empty).
- `plugin.json` must include a `permissions` array (can be empty).
- `maestro-plugin.yaml` must include a `permissions:` section.

## Path Safety Rules

Extension and plugin entrypoints must be relative and must not target sensitive paths.
The guardrail enforces the following path constraints:

- No absolute paths (must not start with `/`).
- No parent traversal (`..`).
- No references to `secrets` or `.env`.

## Governed Exceptions

VS Code extensions under `extensions/` with `package.json` and `engines.vscode` are governed
exceptions and are validated only for the manifest presence that identifies them.
