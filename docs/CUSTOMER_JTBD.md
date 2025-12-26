# Customer Jobs-to-Be-Done (JTBD)

This document canonically defines the core Jobs-to-Be-Done for Summit. All feature development, roadmap planning, and success measurement must map back to one of these jobs.

## 1. Defend Against Influence Operations
**"Detect and neutralize coordinated inauthentic behavior before it impacts reputation or democracy."**

*   **Customer Segment:** Government Defense Agencies, Enterprise Brand Protection Teams.
*   **Trigger:** Detection of anomalous social media activity or receipt of an intelligence tip.
*   **Success Criteria:**
    *   **Time-to-Detection:** < 15 minutes from signal to alert.
    *   **Confidence:** > 95% confidence in attribution before taking action.
    *   **Mitigation:** Verified reduction in reach/engagement of hostile narratives.
*   **Failure Modes:**
    *   False positives leading to censorship of legitimate speech.
    *   Slow detection allowing narratives to go viral.
    *   Inability to visualize the network graph effectively.

## 2. Ensure Regulatory Compliance (Audit Readiness)
**"Prove that all AI and data operations comply with policy (SOC2, GDPR, Internal) without manual effort."**

*   **Customer Segment:** Chief Compliance Officers, Security Engineers, Auditors.
*   **Trigger:** Upcoming audit, customer request for evidence, or internal review cycle.
*   **Success Criteria:**
    *   **Evidence Collection:** 100% automated (Zero manual screenshots).
    *   **Audit Time:** Reduce audit preparation time from weeks to hours.
    *   **Verification:** `prov-verify` passes on all exported bundles.
*   **Failure Modes:**
    *   Missing evidence for a specific time window.
    *   Tampered or unverifiable logs.
    *   "Black box" AI decisions that cannot be explained.

## 3. Orchestrate Reliable Agentic Workflows
**"Execute complex, multi-step agentic processes reliably at scale."**

*   **Customer Segment:** AI Engineers, Product Developers.
*   **Trigger:** User request (e.g., "Research this company"), scheduled task.
*   **Success Criteria:**
    *   **Reliability:** > 99.9% workflow completion rate.
    *   **Transparency:** Full visibility into every step, input, and output.
    *   **Resiliency:** Automatic recovery from transient errors (LLM timeouts, API flakes).
*   **Failure Modes:**
    *   "Silent failure" where a workflow stops without alert.
    *   Infinite loops in agent logic.
    *   Unpredictable costs (token runaways).

## 4. Accelerate Intelligence Analysis
**"Synthesize vast amounts of disparate data into actionable intelligence narratives."**

*   **Customer Segment:** Intelligence Analysts, Strategic Planners.
*   **Trigger:** Request for information (RFI) on a specific topic or entity.
*   **Success Criteria:**
    *   **Time-to-Insight:** Reduce research time from days to minutes.
    *   **Completeness:** Surface hidden connections (2nd/3rd degree) automatically.
    *   **Accuracy:** Citations provided for every generated claim.
*   **Failure Modes:**
    *   Hallucination of non-existent facts or connections.
    *   Overwhelming the analyst with irrelevant noise.
    *   Stale data.

## 5. Safe & Governed AI Experimentation
**"Experiment with powerful AI models and prompts without risking data leakage or policy violation."**

*   **Customer Segment:** Data Scientists, Internal R&D.
*   **Trigger:** Release of a new model (e.g., GPT-5), new internal use case idea.
*   **Success Criteria:**
    *   **Safety:** 0 incidents of PII/Sensitive data leakage to external models.
    *   **Velocity:** Deployed to sandbox in < 5 minutes.
    *   **Governance:** All experiments automatically logged and policy-checked.
*   **Failure Modes:**
    *   Accidental exfiltration of customer data to public APIs.
    *   Shadow IT (running models outside the platform).
    *   Opaque costs/usage.
