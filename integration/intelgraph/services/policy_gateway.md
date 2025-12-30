# Policy Gateway

The policy gateway enforces interface budgets, disclosure rules, and sandbox policies across the evaluator kits.

- Mediates requests to OAMM interfaces and PRC capsules with rate limits and disclosure checks.
- Applies scope tokens for ECRM and propagates egress budgets to downstream modules.
- Emits witness-chain entries and writes digests to the transparency log.
