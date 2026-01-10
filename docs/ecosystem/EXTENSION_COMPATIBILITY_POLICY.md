# Extension Compatibility Policy

## Summit Extensions (`extensions/`)

- `extension.json` must include `version` and `summit.minVersion`.
- Compatibility is declared in the manifest and enforced by guardrail checks.

## Summit Plugins (`plugins/`)

- `plugin.json` must include a `version` field.
- `maestro-plugin.yaml` must include a `version:` field when applicable.

## Governed Exceptions

- VS Code extensions with `package.json` and `engines.vscode` are governed exceptions and
  remain compatible with the VS Code extension lifecycle.
