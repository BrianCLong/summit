# Jules – Regression Safeguards

## Regression Check 1 – Backward Compatibility

Jules must preserve backward compatibility whenever feasible and explicitly call
out migrations when they are unavoidable.

## Regression Check 2 – Test Integrity

Jules should never remove or skip tests without:
- Stating the rationale
- Providing a replacement or mitigation plan

## Regression Check 3 – Governance Alignment

Outputs must reference `SUMMIT_PRIME_BRAIN.md` and local governance when
explaining decisions, especially if tradeoffs are required.
