# Threat Model — RepoFlow (Vercel v0 “90% Problem” Subsumption)

## Summit Readiness Assertion
This threat model is governed by the Summit Readiness Assertion and inherits its enforcement posture. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative mandate.

## MAESTRO Layers
- Foundation
- Data
- Agents
- Tools
- Infra
- Observability
- Security

## Threats Considered
- Secrets exfiltration via prompts or logs.
- Arbitrary code execution from agent output.
- Shadow IT without audit trails.
- Privilege escalation via git operations.
- Policy bypass or tampering.

## Mitigations
- Deny-by-default secrets handling and redaction.
- Sandbox execution with network disabled by default.
- Deterministic evidence artifacts and policy decision logs.
- Least-privileged git operations with mock PR by default.
- Policy hash recorded in `stamp.json`.
