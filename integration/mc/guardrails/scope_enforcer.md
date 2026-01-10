# Scope Enforcer Guardrail

Ensure evidence artifacts are used only within approved scopes.

## Controls

- Validate policy decision tokens against recipient identity and purpose.
- Reject artifacts whose replay token scope does not match the request.
- Log all scope violations for compliance review.
