# MCP Evidence & Provenance Skill

## When to use

Use this skill when exporting audit evidence bundles or validating provenance coverage for MCP sessions.

## Inputs

- Session ID
- Tool invocation metadata (hashed arguments)
- Policy decisions

## Outputs

- Evidence bundle (manifest, steps, policy decisions, checksums)
- Trace IDs for correlation

## Failure modes

- Missing session ID
- Evidence store not initialized
- Checksums mismatch due to non-deterministic ordering

## Examples

- Export `manifest.json` and `steps.jsonl` for a session audit.
- Attach `checksums.txt` to a compliance ticket.

## Security notes

- Do not include raw secrets or tokens in evidence bundles.
- Use stable ordering and hashing to prevent tampering claims.
