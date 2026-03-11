# Counterintelligence Risk Scoring

This document explains the Counterintelligence (CI) risk scoring model used in the Summit platform to identify and prioritize potential adversarial narrative operations.

## Scoring Methodology

The `CounterintelligenceScorer` calculates a composite risk score ranging from 0.0 to 1.0, derived from three primary signal categories:

1.  **Coordination Score (40%)**: Measures the degree of synchronization across multiple sources promoting a narrative. High coordination within a compressed timeframe is a strong indicator of non-organic activity.
2.  **Pattern Match Score (40%)**: Indicates the presence of known adversarial narrative structures (e.g., coordinated delegitimization) as defined in the Adversarial Narrative Pattern Library.
3.  **Source Reliability (20%)**: Factors in the historical reliability and provenance of the sources involved. Lower reliability increases the risk score.

### Engagement State Modifiers

The score is further adjusted based on the current `EngagementState` of the assets involved:
- **Confirmed Adversarial**: Increases the score by +0.2 (capped at 1.0).
- **Monitored / Turned**: Decreases the score by -0.05, reflecting reduced uncertainty due to active defensive monitoring.

## Qualitative Risk Levels

Scores are mapped to qualitative labels to provide interpretable insights for analysts:

| Score Range | Risk Level | Description |
| :--- | :--- | :--- |
| **0.8 - 1.0** | **Critical** | Highly likely coordinated campaign coordination or confirmed adversarial operation. |
| **0.6 - 0.8** | **High** | Strong indicators of possible probing or narrative seeding. |
| **0.4 - 0.6** | **Medium** | Suspicious activity requiring further investigation. |
| **0.0 - 0.4** | **Low** | Routine activity with no significant CI signals. |

## Tripwires and Alerts

Tripwires are automatically triggered when specific thresholds are crossed:
- **Pattern Tripwire**: Triggered when a narrative matches an adversarial pattern with a score exceeding the defined threshold.
- **Coordination Tripwire**: Triggered when the coordination score for a narrative exceeds 0.7.
- **Critical Risk Alert**: Triggered when the composite CI risk score enters the 'Critical' range (> 0.8).

These tripwires generate structured alerts for downstream case management and SIEM systems, enabling rapid defensive response.

## Limitations

- **False Positives**: Rapidly developing organic events or cultural trends can sometimes mimic coordinated patterns.
- **Model Evasion**: Adversaries may attempt to evade detection by lowering coordination or varying narrative structures.
- **Context Dependency**: Scores should always be interpreted within the broader geopolitical and organizational context.
