# Plugin SDK v1

## Capabilities
- `readGraph`: read-only graph queries.
- `export`: sanitized export to approved targets.

## Manifest
- `name`, `version`, `capabilities`, `signature`, `sbomDigest`.

## Security
- Plugins must be signed and provide SBOM digest.
- Loaded in WASM/subprocess sandbox with capability tokens.
- No network or filesystem access without explicit capability.

