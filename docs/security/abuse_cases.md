# NDD Abuse Cases & Mitigations

## Abuse Case 1: Political Targeting
- **Risk**: Analysts use alerts to target political actors.
- **Mitigation**: Policy-as-code gates for restricted entities, mandatory audit logs, and human approval for exports.

## Abuse Case 2: Actor Deanonymization
- **Risk**: Correlating signals to reveal identities.
- **Mitigation**: Hash actor IDs by default, privileged unmasking with approval + audit.

## Abuse Case 3: Metric Gaming
- **Risk**: Adversaries seed noise to manipulate scores.
- **Mitigation**: Evidence budget limits, anomaly detection on origin density shifts, and controlled thresholds.

## Abuse Case 4: Overreach Automation
- **Risk**: Automated punitive actions triggered by alerts.
- **Mitigation**: Default advisory mode; policy requires human-in-the-loop for action.
