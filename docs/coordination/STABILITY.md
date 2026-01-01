# Stability & Oscillation Guards

## 1. Oscillation Detection

The system detects "thrashing" or "flip-flopping" by monitoring the frequency of similar actions proposed by the same intent within a short window (1 minute).

## 2. Stability Controls

*   **Threshold**: 3 repeated actions within 1 minute trigger a warning and suppression.
*   **Cool-down**: Loops detecting instability are effectively cooled down by rejecting their actions until the window clears.
