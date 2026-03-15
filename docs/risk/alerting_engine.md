# Alerting Engine

This document details the Risk-Based Alerting (RBA) Engine.

## Logic
The engine consumes stream `RiskEvent` objects, aggregating them per-subject (persona or campaign) within a defined rolling time window (e.g., 24 hours). An alert is generated if the maximum risk score in the window crosses a defined threshold.

Deduplication occurs by silencing subsequent alerts for the same subject within the rolling window.

### Commander's Intent
The RBA engine dramatically improves signal-to-noise ratio by ensuring that only sustained or critical aggregated risks produce alerts, allowing analysts to focus on real defensive priorities.

### Abuse Analysis
**Risk:** Aggregated alerting could be weaponized to trigger automated, disproportionate countermeasures against subjects.
**Mitigation:** The engine produces `RiskAlert` objects internally only. It strictly isolates detection from response and does not integrate with active remediation or blocking tools.
