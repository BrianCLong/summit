# Entropy and Coordination Signals

## Overview
Entropy-based monitoring is used to detect automation and coordination in online behavior. Unlike attribution, which claims intent, entropy measures purely statistical irregularity.

## Signal Types

### Low Entropy (High Coordination)
- **Definition**: Multiple accounts or assets producing near-identical content, timing, or metadata.
- **Threshold**: Shannon entropy < 0.5 (on normalized observations).
- **Interpretation**: Strong indicator of automation or scripted coordination.

### High Entropy (High Variance)
- **Definition**: Highly erratic or non-patterned behavior.
- **Threshold**: Shannon entropy > 2.5.
- **Interpretation**: May indicate evasive tactics or highly diverse human activity.

## Usage Guardrails
1. **Non-Attributive**: Signals are tagged as "non-attributive". They indicate *patterns*, not *intent*.
2. **Non-Singleton**: Entropy signals must never be used as the sole basis for a classification or decision. They are auxiliary inputs to the reasoner.
3. **Calibration**: Thresholds are calibrated against known baseline datasets to minimize false positives.
