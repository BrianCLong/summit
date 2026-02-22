# Entropy Guard
Purpose: fight predictable architecture drift by enforcing narrow, explicit rules.
Rationale: entropy + cognitive limits make drift inevitable without continuous enforcement.

## Feature flags
- SUMMIT_ENTROPY_GUARD=off → disables failure (still reports)

## Rule lifecycle
1) Start warn-only, collect baseline
2) Add deny-by-default fixtures
3) Promote to fail for high-signal rules
