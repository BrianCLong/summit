# Guardrail: Verify First

All tool calls must verify policy decisions and commitment envelopes before acting on outputs.

## Requirements

- Validate policy decision IDs and rule digests.
- Verify commitment roots for artifacts.
- Reject unverified artifacts and log compliance decision.
