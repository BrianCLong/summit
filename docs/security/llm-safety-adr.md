# ADR: LLM Safety Boundaries

## Status
Accepted

## Decision
- Tool usage limited to allowlisted actions; no shell or filesystem access without explicit override.
- Sensitive data classes (PII, secrets, credentials, national-security info) cannot be returned raw; outputs must be redacted and summarized with citations.
- Model sandbox prohibits outbound network egress.
- False-positive suppressions require justification and expiry; logs retained for 1 year.

## Alternatives Considered
- Relying solely on prompt-based safeguards was rejected due to weak guarantees.
- Coarse policy per service was rejected; per-request scoping provides better least privilege.

## Consequences
- Additional latency (~30-50ms) for filtering and provenance generation.
- Stronger auditability and defense against injection and exfiltration attempts.
