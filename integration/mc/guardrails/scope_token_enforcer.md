# Scope Token Enforcer

Applies correlation tokens and policy scopes consistently across tools.

## Rules
- IPIO, IDCP, OMCP, TCGI honor policy scopes from replay tokens; LLCT enforces linkage-limited correlation tokens.
- Block execution if scopes conflict with requested operations (e.g., EXPORT without authorization).
- Cache scope validations per token TTL to reduce latency.
