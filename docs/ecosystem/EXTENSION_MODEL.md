# Extension Model

## Scope

Extensions are optional, third-party, or separately deployed artifacts that integrate with Summit.
The current repository exposes two enforced extension surfaces:

- `extensions/` — Summit extensions defined by a local `extension.json` manifest.
- `plugins/` — Summit plugins defined by `plugin.json` or `maestro-plugin.yaml` manifests.

Examples remain in `extensions/examples/` and `examples/plugins/` and are reference-only.

## Required Artifacts

- `extension.json` is the canonical manifest for Summit extensions.
- `plugin.json` (or `maestro-plugin.yaml`) is the canonical manifest for Summit plugins.

## Governed Exceptions

The following IDE extensions are governed exceptions and remain scoped to their upstream
extension systems:

- `extensions/vscode-maestro` (`package.json` with `engines.vscode`)
- `extensions/symphony-ops` (`package.json` with `engines.vscode`)

These exceptions are tracked as intentional deviations and remain within the extension surface.
