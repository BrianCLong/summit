# Agent Trace Security & Privacy

## Threat Model

### 1. Spoofed Attribution
**Threat**: A developer or agent provides false attribution data.
**Mitigation**: Integrity signatures (Lane 2) ensure that traces cannot be tampered with after creation. CI gates verify that traces match the changes in the PR.

### 2. Sensitive Link Leakage
**Threat**: Conversation URLs may contain sensitive tokens or PII in query parameters.
**Mitigation**: The validator and evidence emitter automatically redact query strings and fragments from all URLs.

### 3. Trace Tampering
**Threat**: Historical traces are modified to hide AI involvement.
**Mitigation**: Traces are stored in a deterministic directory structure keyed by VCS revision. Integrity checks verify the consistency of these records.

## Privacy Policy

- Only `https://` URLs are allowed.
- Query parameters and fragments are FORBIDDEN in raw trace records and automatically redacted in evidence artifacts.
- An allowlist of trusted domains (e.g., `api.cursor.com`) is enforced.
