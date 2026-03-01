# Summit Studio v1: Pilot Strategy & Operationalization

## Overview
The objective of the Summit Studio v1 pilot is to instrument, validate, and iterate the end-to-end "60-min build" and "60-sec value" loop with real users. We will operationalize Studio v1 for non-technical customers by instrumenting the full funnel, running guided pilots, and hardening the "describe → build → run → trust" loop.

Based on Summit's "Provable Intelligence" Go-To-Market (GTM) strategy, our first pilots will be anchored strictly in our Ideal Customer Profile (ICP): **Enterprise CTI/SOC** and **Regulated Investigations/Legal** teams.

## 1. End-to-End Journey Instrumentation
We must instrument and track a single "golden path" to identify drop-off at each stage:
- **The Golden Path Funnel:** Sign-up → Conversational Onboarding → First Agent Created → First Governed Run → First Successful Outcome.
- **Key Latency Metrics:**
  - Log `time-to-first-visible-value` (Target: ≤60 seconds to a high-quality draft workflow).
  - Log `time-to-first-meaningful-outcome` (Target: ≤60 minutes to a safely running governed agent).

## 2. Pilot Cohorts & Playbooks
We will target 2–3 narrow pilot personas within our ICP and ship opinionated starter playbooks aligned to their top use cases:

- **Persona A: SOC Analyst (Enterprise CTI)**
  - *Playbook:* Phishing/Alert Triage & Automated Enrichment.
- **Persona B: Compliance/Investigations Lead (Regulated Legal)**
  - *Playbook:* Provenance Tracking & Insider Threat Case Preparation.

**Pilot Execution:** Run small, high-touch pilots. Observe where non-technical users stall, what they misinterpret in Studio, and what they expect by default. Convert these findings into concrete UX and copy changes.

## 3. In-Product Adoption Aids
To guide users through the initial setup, we will embed contextual "Agent Adoption Playbook" patterns into Studio:
- **Embedded Checklists:** Include guided steps such as "start with one low-risk workflow," "keep humans-in-the-loop first," and "define success metrics before enabling auto-actions."
- **Adaptive Nudges:** If a user stalls (e.g., no first run within `N` minutes), trigger a conversational helper that proposes next best actions or offers to auto-complete missing pieces.

## 4. Trust, Safety, and Explainability Surfaces
Given our strict focus on governed, provable actionability:
- **Human-Readable Explainability:** Make every run explain itself in human terms. Explicitly detail what data was used, what steps were taken, and why it recommends each action, tuned for SOC/Compliance personas rather than engineers.
- **Co-Pilot Mode by Default:** Require "co-pilot" mode by default in pilots where agents propose actions and humans approve. Summit will log how often users accept, edit, or reject suggestions as a critical trust signal.

## 5. Readiness & Feedback Loops
Implement mechanisms to capture qualitative and quantitative feedback:
- **In-Product CS Hooks:** Add NPS-style micro-surveys immediately after the first successful run, and trigger a "tell us what blocked you" short form on abandonment.
- **Internal Observability Dashboards:** Ship internal dashboards (via Grafana/Prometheus with the `summit` namespace) to monitor funnel metrics, pilot cohort health, common failure modes, and most-used starter playbooks. This data will drive the next Studio iteration and documentation.

## 6. Success Criteria
To deem the pilot a success and prepare for v1.1, the following criteria must be met:
- **Adoption Latency:** ≥50% of pilot users reach a first successful governed run in under 60 minutes, without engineering help.
- **Immediate Value:** ≥30% reach a clearly valuable outcome in under 60 seconds (e.g., an accurate, editable automation draft).
- **Blocker Identification:** Clear top 3 blockers identified (e.g., UX friction, language/terminology, integration hurdles, guardrail strictness) with concrete changes spec'd for Studio v1.1.
