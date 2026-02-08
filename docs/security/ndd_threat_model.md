# NDD Threat Model

## MAESTRO Layers
- Foundation
- Data
- Agents
- Tools
- Observability
- Security

## Threats Considered
- Adversarial adaptation to metrics (gaming origin density, staged corrections).
- Prompt injection or tool misuse in automated workflows.
- Analyst misuse for political targeting.
- Privacy leakage or deanonymization of actors.

## Mitigations
- Policy-as-code enforcement for allowed use cases and restricted entities.
- Deterministic evidence artifacts with stable IDs and audit trails.
- Hash-based actor identifiers with privileged unmasking under approval.
- Rate limiting and scoped tokens for API access.
- Observability hooks for determinism failures and model hash drift.

## Secure-by-Default API Guidance
- Deny by default; require explicit policy allow for access.
- Scoped tokens with tenant isolation enforcement.
- Rate limits per tenant and endpoint.

## Security Test Plan (Summary)
- Negative tests for unauthorized access and scope violations.
- Red-team scenarios for metric gaming.
- Policy gate tests that verify enforcement hooks are invoked.
