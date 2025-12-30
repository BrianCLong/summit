# Guardrail: Verify-First

All MC tools must verify policy decisions and attestations before executing remote calls.

## Checks

- Ensure policy gateway approves requested action.
- Validate determinism token requirements (snapshot/version) before replay operations.
- Confirm federation or export tokens when crossing tenant boundaries.
