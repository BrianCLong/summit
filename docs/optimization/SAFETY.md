# Safety Rails & Kill Switches

This document outlines the safety mechanisms in place to prevent unintended consequences from autonomous optimizations. These include hard limits on the magnitude of changes, a "kill switch" to immediately halt all optimizations, and anomaly detection to identify and respond to system instability.

## 1. Hard Limits

To prevent drastic changes that could destabilize the system, the following hard limits are enforced:

*   **Max Change per Interval:**
    *   No single optimization action can change a parameter by more than 20% of its current value in a 24-hour period.
    *   This limit is configurable on a per-loop basis.
*   **Rollback Thresholds:**
    *   If an optimization action results in a degradation of a key metric (e.g., a 10% increase in error rate) that persists for more than 5 minutes, the action will be automatically rolled back.

## 2. Kill Switch

A global "kill switch" is available to immediately disable all autonomous optimization loops.

*   **Activation:**
    *   The kill switch can be activated by users with the `Administrator` or `SRE` role.
    *   Activation is instantaneous and requires no confirmation.
*   **Behavior:**
    *   When activated, all in-progress optimization actions are halted.
    *   No new optimization actions will be initiated.
    *   The system can be configured to automatically revert the last `N` actions taken.

## 3. Anomaly Detection

The system includes anomaly detection capabilities to identify and respond to harmful oscillations or other signs of instability.

*   **Harmful Oscillation:**
    *   The system monitors for "flip-flopping" behavior, where an optimization loop repeatedly enables and disables a feature or adjusts a parameter up and down.
    *   If such behavior is detected, the loop is automatically paused, and an alert is sent to the on-call team.
*   **Auto-Pause on Instability:**
    *   If the system detects a significant increase in the volatility of a key metric following an optimization action, the responsible loop will be automatically paused.
    *   This prevents the system from "chasing its tail" and exacerbating a problem.
