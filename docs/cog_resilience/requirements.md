# Cognitive Resilience Requirements

## Source-to-Requirements

Based on analysis of PLA "cognitive domain operations" (RAND, TRADOC, Jamestown), the following requirements define the defensive posture of the `cog_resilience` module.

## Allowed Indicator Categories

These categories represent aggregate health/resilience signals, not targeting vectors.

1.  **Morale Proxy**
    - _Definition:_ Aggregate measure of will to fight/persist.
    - _Context:_ Counters "subduing soldiers without war".
2.  **Cohesion Proxy**
    - _Definition:_ Strength of social/unit bonds.
    - _Context:_ Detects fragmentation or polarization efforts.
3.  **Trust Proxy**
    - _Definition:_ Confidence in leadership/institutions.
    - _Context:_ Monitors legitimacy questioning.
4.  **Decision Friction Proxy**
    - _Definition:_ Latency or confusion in decision-making cycles.
    - _Context:_ Identifies "cognitive survey" effects or information flooding.
5.  **Polarization Proxy**
    - _Definition:_ Degree of divide in sentiment/narrative adherence.
    - _Context:_ Indicator of narrative dominance attempts.

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
