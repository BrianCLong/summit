# Cognitive Load Shedding

## The Operator's Dilemma

Modern operational environments suffer from a "signal-to-noise" crisis. As systems grow more complex, the volume of telemetry (logs, metrics, traces, alerts) grows exponentially, while human cognitive capacity remains fixed.

Operators are drowning in data but starving for insight. They are asked to function as "human routers," triaging raw alerts and mentally constructing the state of the world. This leads to **Decision Fatigue**: the deteriorating quality of decisions made by an individual after a long session of decision making.

## Summit's Thesis: Remove Unnecessary Thinking

Summit is designed to be a **cognitive load shedding** system. Its goal is to allow operators to perform *fewer, higher-quality* cognitive cycles.

### 1. From Alert Flood to Choice Architecture

Summit sits between the raw telemetry stream and the human operator. It does not just aggregate alerts; it synthesizes them into **Narratives**.

*   **Before Summit:** 500 alerts about "High CPU," "Latency Spike," and "Error Rate."
*   **With Summit:** 1 Narrative: "Service Degradation in Payment Gateway likely caused by Deployment #1234."

The operator is presented with a **Choice**, not a puzzle.
*   *Option A:* Auto-remediate (Rollback).
*   *Option B:* Investigate further (Open War Room).
*   *Option C:* Ignore (Mark as False Positive).

### 2. Explained Relevance

Summit never just says *that* something happened. It explains *why it matters*.
Every narrative includes:
*   **Causality:** What likely caused this? (Provenance Graph)
*   **Impact:** What is currently broken? (Dependency Graph)
*   **Urgency:** How much time do we have? (SLA/SLO context)

This "pre-digestion" of context saves the operator 15-30 minutes of manual correlation per incident.

### 3. Bounded Responsibility

Anxiety comes from open-ended responsibility ("I don't know what I don't know"). Summit provides **Bounded Responsibility**.
The system says: *"Here is the complete context as known. Here are the valid actions permitted by policy."*

This reduces the "Fear Of Missing Out" (FOMO) on critical data and allows the operator to trust that the system has done the heavy lifting.

## Psychological Impact

*   **Reduced Burnout:** Operators spend less time parsing logs and more time solving problems.
*   **Higher Confidence:** Decisions are backed by visible evidence, reducing "imposter syndrome" in crises.
*   **Less "Residue":** Because the system tracks the state, operators don't have to carry the mental model of the incident home with them.

## Conclusion

We do not pay operators to triage alerts. We pay them to make difficult decisions. Summit ruthlessly automates the former to liberate energy for the latter.
