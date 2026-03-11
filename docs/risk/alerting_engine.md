# Risk-Based Alerting Engine

## Commander's Intent
This module implements the alerting logic over the persona and campaign risk objects. To prevent alert fatigue and provide low-noise, tiered defensive alerts, we only surface alerts when aggregated signals meet specific thresholds (either by total score or by the frequency of high-severity events) within a rolling time window. All active alerts are de-duplicated to ensure analysts focus on unified, escalating entity states.

## Alerting Mechanics
- **Rolling Windows:** The engine evaluates events over a configurable window (default: 24 hours). Older events naturally expire.
- **Thresholds:**
  - `score_threshold`: Total accumulated risk score in the window (default: 75.0).
  - `high_event_threshold`: Number of HIGH/CRITICAL events in the window (default: 3).
- **De-duplication & Escalation:** If an entity crosses a threshold while already having an active (non-`HANDLED`) alert, a new alert is NOT created. Instead, the existing alert is updated, and its severity is escalated if necessary (e.g., from `HIGH` to `CRITICAL`).

## Analyst Triage
Alerts support human-driven state transitions (`NEW`, `IN_REVIEW`, `HANDLED`). The engine maintains an audit log (`state_history`) for all transitions.

## Abuse Analysis
**Potential Misuse:** The alerting engine might be misconfigured to lower thresholds excessively, creating noise that masks actual threats, or configured to trigger automated responses (e.g., blocking) without human oversight.
**Mitigation:** The alerting engine logic is strictly read-only and analytical. It produces `RiskAlert` objects and manages their states but does not trigger external actions. Any future integrations that operationalize automated responses will be governed by explicit SAFE_AUTOMATION policies and require human-in-the-loop review.
