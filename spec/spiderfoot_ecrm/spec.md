# Export-Control & Releasability-Managed OSINT (ECRM)

ECRM executes OSINT runs inside scope-controlled sandboxes that emit releasability-ready outputs and enforce module/network policies for DARPA collaborations.

## Objectives

- Enforce scope tokens that bind sharing scope, performer identity, and TTL.
- Apply sandbox policies with egress monitoring and budgets.
- Partition outputs into releasability tiers with manifests and cryptographic commitments.

## Workflow

1. Receive OSINT request and scope token.
2. Select sandbox policy based on scope token.
3. Execute OSINT modules under sandbox while monitoring egress.
4. Generate selective-disclosure results, egress receipt, and tier manifest.
5. Output appropriate tiers for evaluator or coalition sharing.
