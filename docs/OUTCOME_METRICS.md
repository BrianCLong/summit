# Outcome Metrics

This document defines the key metrics used to measure the success of Customer Jobs-to-Be-Done (JTBD). These metrics prioritize customer value over system activity.

## Global Definitions

*   **Time-to-Outcome:** The wall-clock time from the user's intent (trigger) to the successful delivery of value.
*   **Success Rate (Outcome):** The percentage of initiated jobs that result in a verified positive outcome, excluding user errors (e.g., "invalid input").
*   **Friction Index:** (Estimated) Number of manual steps or approvals required to complete the job.

## 1. Defend Against Influence Operations

*   **Metric:** `defense.time_to_detection_ms`
    *   **Definition:** Time from first ingestion of hostile signal to alert generation.
    *   **Goal:** < 15 minutes.
*   **Metric:** `defense.mitigation_confidence_score`
    *   **Definition:** The calculated confidence (0-1) of the attribution model at the time of mitigation.
    *   **Goal:** > 0.95.

## 2. Ensure Regulatory Compliance

*   **Metric:** `compliance.evidence_collection_automation_ratio`
    *   **Definition:** `(Automated Evidence Items) / (Total Evidence Items)`
    *   **Goal:** 1.0 (100%).
*   **Metric:** `compliance.bundle_verification_success_rate`
    *   **Definition:** Percentage of exported bundles that pass `prov-verify`.
    *   **Goal:** 100%.

## 3. Orchestrate Reliable Agentic Workflows

*   **Metric:** `maestro.workflow_reliability_rate`
    *   **Definition:** `(Successful Runs) / (Total Runs - User Cancellations)`
    *   **Goal:** > 99.9%.
*   **Metric:** `maestro.recovery_rate`
    *   **Definition:** Percentage of runs that encountered a transient error but successfully recovered via retry.

## 4. Accelerate Intelligence Analysis

*   **Metric:** `intel.time_to_insight_ms`
    *   **Definition:** Time from `search_initiated` to `report_generated`.
    *   **Goal:** Trending down.
*   **Metric:** `intel.citation_coverage`
    *   **Definition:** Percentage of generated claims that have a linked graph evidence node.

## 5. Safe & Governed AI Experimentation

*   **Metric:** `governance.policy_block_rate`
    *   **Definition:** Percentage of requests blocked by OPA/PII filters (indicates safety system active).
*   **Metric:** `governance.data_leakage_incidents`
    *   **Definition:** Count of detected PII entities in egress traffic to external LLMs.
    *   **Goal:** 0.
