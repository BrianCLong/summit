# S-ADK Data Handling Rules (IBM ADK Parity Shape)

## Never Log
- Connection secrets or auth headers.
- API tokens or private keys.
- Raw knowledge-base documents.
- Customer identifiers or case data.

## Retention
- Store only derived hashes and redacted traces in `artifacts/agent-runs/`.
- Default to local-only artifacts; publishing requires explicit command.

## Redaction Expectations
- Scrub known secret patterns before writing trace events.
- Prefer hash references over raw payloads.

## Enforcement Notes
- Packaging rejects `.env` files and files containing secret-like tokens.
- Tool execution is deny-by-default unless explicitly allowlisted and gated.
