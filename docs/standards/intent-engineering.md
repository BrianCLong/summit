# Intent Engineering Standards

## Principles
1. **Explicit Intent**: AI agents require structured inputs that encode intent, not just raw content.
2. **Efficiency**: HTML is inefficient for AI consumption; structured formats (e.g., Markdown) reduce noise and token overhead.
3. **Completeness**: Intent engineering extends beyond prompts to objectives, constraints, stop rules, and machine-interpretable structure.
4. **Content Negotiation**: Web infrastructure must serve both humans and agents via structured intent negotiation.
5. **Reliability**: Agent behavior reliability improves when semantic structure is explicit.

## Subsystems

| Summit Component | Backed By | Type |
|-----------------|------------|------|
| `intent_spec.yaml` schema | CLAIM-01, CLAIM-03 | Derived |
| Markdown ingestion pipeline | CLAIM-02, CLAIM-04 | Derived |
| Objective/Constraint enforcement engine | CLAIM-03 | Derived |
| Deterministic intent execution record | Summit original | Core |
| CI intent validation gate | CLAIM-05 | Derived |

## Matrix of Artifacts

| Import | Export |
|---------|---------|
| YAML intent spec | JSON report |
| Markdown input | metrics.json |
| CI gate result | policy status |

## Non-goals
- No execution orchestration
- No autonomous agent runtime
