# Golden Paths Overview

## Principle
Golden paths represent the curated, end-to-end workflows sanctioned by the platform governance council. Each path integrates AI guidance, policy guardrails, and telemetry capture by default.

## Current Golden Paths
1. **Service Bootstrap Path**
   - CLI command `tools/deploy/init --template service-web`
   - Portal wizard step verifying policy coverage and dependency declarations.
   - Knowledge graph update ensures service + environment nodes created with baseline policies.
2. **Safe Deployment Path**
   - Intent translator generates deployment action plan with rollback and approval steps.
   - Maestro predictive insights produce readiness score (risk, capacity, compliance).
   - Policy guardrail gateway records approval event and publishes audit entry.
3. **Incident Recovery Path**
   - Maestro self-healing suggests remediation; translator builds human-readable steps.
   - Approval queue triggered when risk tier ≥ 3.
   - Post-recovery survey captured, feeding DX telemetry pipeline.

## Adoption Plan
- Publish path-specific checklists in `enablement/playbooks/devexp`.
- Embed inline prompts within CLI/UI referencing knowledge graph context.
- Track adoption via knowledge graph `GoldenPathEvent` relationships.
