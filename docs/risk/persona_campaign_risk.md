# Persona and Campaign Risk

This document describes the structured risk objects for personas and campaigns within the risk-based alerting layer.

## Scoring Model
The risk score is a numerical value between 0 and 100, which maps to a tiered risk level:
- LOW: 0-24
- MEDIUM: 25-49
- HIGH: 50-74
- CRITICAL: 75-100

### Inputs
Persona risks use factors such as `deception_profile`, `cross_platform_spread`, `persona_army_patterns`, and `watchlist_hit`.
Campaign risks use factors such as `target_criticality`, `amplification_volume`, `negative_sentiment`, and `executive_targeting`.

### Commander's Intent
This model establishes a transparent, explainable risk-based foundation for defensive persona and campaign monitoring, ensuring we elevate signals into actionable risk tiers without generating alert fatigue.

### Abuse Analysis
**Risk:** The risk objects could be misused to establish unauthorized surveillance or target personas for non-defensive operations.
**Mitigation:** The model is scoped strictly for defensive internal monitoring. It computes risk purely to inform internal investigations and generates no outward action, blocking, or banning.
