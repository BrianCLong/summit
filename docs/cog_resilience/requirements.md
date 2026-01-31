# Cognitive Resilience Requirements

## Source-to-Requirements
Based on analysis of PLA "cognitive domain operations" (RAND, TRADOC, Jamestown), the following requirements define the defensive posture of the `cog_resilience` module.

## Allowed Indicator Categories
These categories represent aggregate health/resilience signals, not targeting vectors.

1.  **Morale Proxy**
    - *Definition:* Aggregate measure of will to fight/persist.
    - *Context:* Counters "subduing soldiers without war".
2.  **Cohesion Proxy**
    - *Definition:* Strength of social/unit bonds.
    - *Context:* Detects fragmentation or polarization efforts.
3.  **Trust Proxy**
    - *Definition:* Confidence in leadership/institutions.
    - *Context:* Monitors legitimacy questioning.
4.  **Decision Friction Proxy**
    - *Definition:* Latency or confusion in decision-making cycles.
    - *Context:* Identifies "cognitive survey" effects or information flooding.
5.  **Polarization Proxy**
    - *Definition:* Degree of divide in sentiment/narrative adherence.
    - *Context:* Indicator of narrative dominance attempts.

## Forbidden Metrics (Success Measures)
The following metrics are typical of offensive influence campaigns and are **strictly prohibited** in Summit.

- **Persuasion Lift:** Change in opinion due to messaging.
- **Conversion Rate:** Action taken based on influence.
- **Engagement Optimization:** Maximizing dwell time or interaction.
- **Target Susceptibility Score:** Identifying vulnerable individuals.
- **Micro-segment Reach:** Penetration of specific psychographic groups.

## Governance Gates
- **Policy Firewall:** All inputs/outputs must be validated against `policies/cog_resilience/policy.yaml`.
- **Data Minimization:** `additionalProperties: false` in schemas; PII redaction in audit logs.
- **Determinism:** All evidence artifacts must use sorted keys and isolated timestamps.
