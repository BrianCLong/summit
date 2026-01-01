# Shadow Mode Report (Phase 2)

**Status:** [DRAFT / FINAL]
**Date:** YYYY-MM-DD
**Period:** Days 15–30

## Executive Summary
In Shadow Mode, Summit observed [Number] security decisions without intervening.
It agreed with human operators in [X]% of cases.
It identified [Y] cases where actions were taken with insufficient evidence.

## Comparison Metrics

| Metric | Human Operator | Summit (Shadow) | Delta |
| :--- | :--- | :--- | :--- |
| **Total Decisions** | [Count] | [Count] | - |
| **Approval Rate** | [X]% | [Y]% | [+/- Z]% |
| **Avg. Evidence Count** | [N] artifacts | [M] artifacts | - |
| **Decision Latency** | [Time] | [Time] | [Faster/Slower] |

## Confidence Gap Analysis

### 1. False Certainty (Human Confident, Summit Doubtful)
* **Scenario:** Operator blocked IP 1.2.3.4.
* **Human Rationale:** "It looked malicious."
* **Summit Analysis:** **Confidence 0.4**. Only 1 log source provided. IP belongs to a known CDN.
* **Risk:** Potential false positive / outage.

### 2. Missed Signals (Human Hesitant, Summit Confident)
* **Scenario:** Operator delayed isolating Host-A.
* **Human Rationale:** "Waiting for confirmation."
* **Summit Analysis:** **Confidence 0.9**. 3 distinct IoCs present. Policy dictates immediate isolation.
* **Opportunity:** Reduced Mean Time to Contain (MTTC).

## Patterns Identified
* [Pattern 1: e.g., "Graveyard shift decisions have lower evidence quality"]
* [Pattern 2: e.g., "DLP alerts are ignored 90% of the time, Summit agrees 85%"]

## Recommendations for Phase 3
* Enable **Soft Gating** for [Decision Type A].
* Keep [Decision Type B] in Shadow Mode (needs more training data).
* Require [Specific Evidence] for all High Severity incidents.
