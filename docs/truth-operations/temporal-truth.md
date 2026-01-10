# Temporal Truth Protection

**Truth has a half-life.** Correct information delivered after the decision window is operationally equivalent to false information. Summit protects temporal relevance by prioritizing timely, partially certain signals over perfect but late certainty.

## Principles

- Time-to-decision is a first-class constraint for every workflow.
- Early warnings with partial integrity can be more valuable than delayed certainty.
- Latency anomalies are treated as adversarial signals, not benign delays.

## Temporal Relevance Curves

For each decision class (e.g., tactical alerting, policy updates, public reporting):

- Define **relevance windows** (start, peak, decay) with actions allowed per phase.
- Set **minimum viable signal** thresholds that allow degraded but timely outputs.
- Calibrate **error vs delay trade-offs** with explicit risk tolerances.

## Workflow

1. **Timestamp & Clock Sync**: enforce synchronized clocks and capture end-to-end latency per hop.
2. **Align to Decision Windows**: tag incoming signals to relevant windows; discard or quarantine stale data.
3. **Escalate Partial Truths**: when latency threatens the window, emit partial truth packets with integrity annotations.
4. **Override Protocol**: allow humans to deliberately delay or silence action when risk of error exceeds risk of delay, with justification and explicit expiry.
5. **Post-Window Handling**: downgrade influence of signals that arrive after decay; keep for forensic context, not decisions.

## Metrics

- **Latency Budget Burn**: percentage of budget consumed per pipeline stage.
- **Window Hit Rate**: proportion of decisions made within relevance windows.
- **Error-vs-Delay Outcomes**: tracked to tune partial truth thresholds.
- **Timing Attack Detections**: counts and MTTR for adversarial delays.

## Safeguards

- **Temporal Integrity Caps**: integrity score is capped when latency exceeds policy thresholds.
- **Fallback Path**: degrade to cached summaries or peer-sourced corroboration when primary feeds stall.
- **Strategic Silence**: document deliberate non-action with evidence to prevent forced, rushed responses.
