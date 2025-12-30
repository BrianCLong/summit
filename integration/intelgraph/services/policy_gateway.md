# Policy Gateway

Central guardrail enforcing policy, budget, and jurisdiction constraints for all wedge services.

## Functions
- Validate replay tokens, budgets, and scope attributes before execution.
- Enforce jurisdictional rules (export, identifier handling) for LLCT and other wedges.
- Route requests requiring attestation to attestation service; reject if missing required quotes.
- Log decisions to transparency log with policy version identifiers.
