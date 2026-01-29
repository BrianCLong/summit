# Decisions: item-unknown

## Decisions Made
- Shipped subsumption scaffolding without ITEM specifics to avoid hallucination and IP risk.
- Enforced evidence determinism separation: report/metrics/stamp.
- Added deny-by-default fixture requirement (verifier rule planned).

## Alternatives Rejected
- Implementing ITEM-specific features without excerpts (rejected: ungrounded).
- Refactoring existing CI/evidence flows (rejected: blast radius).

## Deferred
- Claim registry grounded in ITEM snippets.
- Graph-native provenance edges for claims.

## Risk Tradeoffs
- Temporary assumed CI check name until required checks discovered.

## GA Alignment
- Improves auditability, determinism, and enforceable governance with minimal surface area.
