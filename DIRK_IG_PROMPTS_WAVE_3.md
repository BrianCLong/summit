# Dirk IG Prompt Library — Wave 3 (Frameworks, KPIs, IR/Detection Depth)

## Executive Summary

This wave extends the Dirk IG prompt library with prompts 21–30. The focus is on framework mappings (NIST/ISO/SOC 2), KPIs/KRIs, deeper incident response/detection content, and a few precision prompts for cloud, AI, and product safety. Copy/paste each, fill in the `<placeholders>`, and you get production-ready artifacts.

## Prompts 21–30

### 21) Framework Mapping & Gap Analysis Pack
> Act in [MODE: WHITE+GOLD].
> Mission: Map our current controls to `<frameworks>` (e.g., NIST CSF 2.0, ISO 27001:2022, SOC 2 CC) and produce a gap analysis.
>
> **Context**
> * Environments: `<clouds / regions / on-prem>`
> * Control sources: `<policies, runbooks, IaC, monitoring>`
>
> **Required Outputs**
> 1. A **control matrix** mapping existing controls to framework requirements (noting gaps/partials).
> 2. A **gap list** with severity, owner, and recommended fixes.
> 3. A **90-day remediation plan** with swimlanes.
> 4. Suggested **evidence collection** methods for each control.
> 5. A **progress dashboard schema** (fields to track status, aging, blockers).

### 22) KPIs & KRIs for Security & Resilience
> Act in [MODE: WHITE].
> Mission: Define **KPIs/KRIs** for `<organization/product>` that are low-theater and decision-useful.
>
> **Context**
> * Domains: `<infra, appsec, detection/response, identity, vendor>`
> * Data sources: `<SIEM, ticketing, CI/CD, HRIS>`
>
> **Required Outputs**
> 1. A **metric set** grouped by domain with formulas and targets.
> 2. **Leading vs lagging** indicators and how to interpret them.
> 3. A **minimal dashboard layout** (charts/tables) for weekly review.
> 4. Guardrails to avoid **vanity metrics** and measurement theater.
> 5. A **data quality checklist** so the metrics don’t drift.

### 23) Incident Response Runbook Generator (Stack-Aware)
> Act in [MODE: BLUE+WHITE].
> Mission: Generate a **stack-aware IR runbook** for `<incident type>` (e.g., auth anomaly, data exfil, ransomware-like behavior).
>
> **Context**
> * Stack: `<cloud, runtime, data stores, queues, observability>`
> * Team: `<on-call structure, SLOs, paging rules>`
>
> **Required Outputs**
> 1. A **phase-structured runbook** (detect → triage → contain → eradicate → recover → learn) with stack-specific steps/commands.
> 2. **Escalation matrix** and decision thresholds.
> 3. **Forensic artifacts** to collect (paths, queries, commands) and retention guidance.
> 4. A **communications template set** (internal, customers, regulators).
> 5. A **tabletop script** to validate the runbook.

### 24) Detection Content Backlog (Signals → Detections → Playbooks)
> Act in [MODE: BLUE].
> Mission: Build a **detection backlog** for `<environment>` (e.g., AWS org, GCP projects, Kubernetes, SaaS IdP).
>
> **Context**
> * Telemetry: `<logs/metrics/traces available>`
> * Current detections: `<brief>`
>
> **Required Outputs**
> 1. A list of **signals** (raw events/fields) mapped to **detection hypotheses**.
> 2. **Detection specs** (logic, thresholds, suppression rules) with false-positive notes.
> 3. Linked **response playbooks** or tickets to create them.
> 4. **Coverage map** against MITRE ATT&CK / common abuse scenarios.
> 5. A **grooming cadence** (owners, SLAs, quality gates).

### 25) IaC Guardrails & Drift Control
> Act in [MODE: WHITE+BLUE].
> Mission: Define **IaC guardrails** and **drift detection** for `<terraform/pulumi/etc>` across `<clouds>`. 
>
> **Context**
> * Repos/pipelines: `<where IaC lives, CI tools>`
> * State mgmt: `<remote backends, locking, approvals>`
>
> **Required Outputs**
> 1. **Pre-commit/CI gates** (lint, policy-as-code, static analysis, OPA checks).
> 2. **Promotion model** (dev → stage → prod) with approvals and change windows.
> 3. **Drift detection & reconciliation** plan (tools, alerting, auto/semiauto repair).
> 4. **Break-glass & rollback** patterns for failed deploys.
> 5. **Audit/evidence** capture for compliance.

### 26) Cloud Provider Footgun Shield
> Act in [MODE: BLUE].
> Mission: Enumerate **provider-specific gotchas** for `<cloud provider + services>` and give guardrails.
>
> **Context**
> * Services in scope: `<list>`
> * Known incidents/outages: `<if any>`
>
> **Required Outputs**
> 1. A prioritized list of **footguns** (misconfigs, defaults, hidden limits) with examples.
> 2. **Prevent/detect** controls for each footgun (config, IaC, monitoring).
> 3. **Golden templates/modules** to bake in the safeguards.
> 4. **Testing guidance** (chaos/probes) to ensure guardrails work.
> 5. **Runbook snippets** for when a footgun is triggered.

### 27) Product Safety & Abuse Resilience Blueprint
> Act in [MODE: BLUE+GOLD].
> Mission: Create a **safety/abuse blueprint** for `<product/feature>`.
>
> **Context**
> * Users/roles: `<who uses it>`
> * Abuse surfaces: `<spam, scraping, automation, bypassing limits>`
>
> **Required Outputs**
> 1. **Abuse personas & playbooks** with likely TTPs.
> 2. **Defense stack**: preventive (rate limits, proofs-of-work, trust signals), detective (anomaly models), responsive (enforcement actions).
> 3. **Policy levers** (ToS, AUP, graduated enforcement) and data retention notes.
> 4. **Experimentation plan** for defenses (A/B, holdouts) with metrics.
> 5. **Cross-functional RACI** (product, eng, trust/safety, legal, comms).

### 28) AI/LLM Red-Team & Safety Valve Pack
> Act in [MODE: WHITE+BLUE].
> Mission: Design **AI/LLM red-team exercises and safety valves** for `<feature/model>`.
>
> **Context**
> * Model: `<API / hosted / fine-tuned / open>`
> * Data: `<PII / proprietary / code / none>`
>
> **Required Outputs**
> 1. **Abuse/threat scenarios** (prompt injection, data leakage, model denial, jailbreaks, bias exploits).
> 2. A **red-team plan** (personas, attack libraries, scoring rubric, gates to release).
> 3. **Safety valves**: guardrails, allow/deny lists, content filters, grounding/verification layers.
> 4. **Rollback criteria** and **kill-switch procedures**.
> 5. **Monitoring hooks** and metrics (hallucination rate, leakage rate, safety trigger rate).

### 29) Evidence & Audit Trail System
> Act in [MODE: WHITE].
> Mission: Design an **evidence capture system** for audits and assurance across `<domains>`.
>
> **Context**
> * Evidence sources: `<tickets, CI logs, IaC plans, SIEM, MDM, HRIS>`
> * Frequency: `<quarterly/rolling>`
>
> **Required Outputs**
> 1. A **data model** for evidence items (fields, tagging, retention, integrity checks).
> 2. **Ingestion playbook** (who uploads, validation, deduplication).
> 3. **Chain-of-custody** procedures and tamper-resistance options (hashing, WORM, signatures).
> 4. **Reviewer workflow** (request → review → approve → expire).
> 5. Minimal **dashboards/reports** for auditors and leadership.

### 30) Continuous Controls Monitoring (CCM) Starter
> Act in [MODE: WHITE+BLUE].
> Mission: Stand up **continuous controls monitoring** for `<scope>` (e.g., IAM hygiene, endpoint posture, pipeline integrity).
>
> **Context**
> * Signals: `<where data comes from>`
> * Tolerances: `<what “good” looks like>`
>
> **Required Outputs**
> 1. A **control list** with measurable checks and thresholds.
> 2. **Collection & normalization** approach (schema, IDs, timestamps, source of truth).
> 3. **Alerting & ticketing** flow with SLAs and auto-assign rules.
> 4. **Exception handling** (time-bound waivers, auto-expiry, review cadence).
> 5. A **rollout plan** with quick wins, pilot scope, and expansion milestones.

## Deployment Notes

* Keep prompts as reusable building blocks—swap `<placeholders>` with stack details.
* Use alongside Waves 1–2 to cover strategy, engineering, identity, cloud, and assurance end-to-end.
* Ideal for seeding runbooks, tickets, tabletop exercises, and compliance evidence.
