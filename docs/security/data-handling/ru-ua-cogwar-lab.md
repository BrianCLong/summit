# RU-UA CogWar Lab Data Handling

## Data Classes

- **PUBLIC_OK**: Public URLs, public org reports, already-public statements.
- **SENSITIVE_OSINT**: Handles, screenshots, or semi-structured scraped text (avoid storing).
- **RESTRICTED**: Anything not clearly public (must not ingest).

## Never-Log List

- Raw social usernames/handles unless already in a cited public report.
- Full post bodies; store hashes + short excerpts (≤240 chars) with citation refs only.
- Access tokens, cookies, session identifiers.
- Private chat exports.

## Storage & Retention

- Store only evidence references and minimal descriptors needed for deterministic matching.
- Prefer hashes + excerpts; avoid full-text payloads unless `data_classification=PUBLIC_OK`.
- Retain artifacts per existing Summit retention policies; no new retention expansion.

## Escalation

- Any ambiguity in classification is **Deferred pending governance review**.
