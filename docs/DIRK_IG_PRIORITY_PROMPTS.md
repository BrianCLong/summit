# Dirk IG Priority Prompt Library

These reusable prompt templates capture the "Dirk IG" Victory Doctrine (risk reduction first, then speed, then cost, then elegance). Use them to generate decision-grade artifacts for security, governance, and financial-intelligence workflows. Fill in the `<placeholders>` before use, and start with Templates 1 and 2 for fastest hardening gains.

## Quickstart
- **Start with risk then detection:** Run Template 1 (org risk map) and Template 2 (detection coverage) for your top threat; you get a Victory Plan plus concrete detections in one sitting.
- **Keep the input contract explicit:** Mission, environment, threat model, constraints, and required outputs should be fully populated to avoid vague answers.
- **Name the mode:** Keep prompts defensive/governance by explicitly setting `[MODE: WHITE]`, `[MODE: BLUE]`, `[MODE: PURPLE]`, or `[MODE: GOLD]` as listed.
- **Include proof-carrying analysis (PCA):** Ask for assumptions, confidence, and uncertainties so reviewers can assess decision quality.
- **Package the outputs:** Save the results with date, owner, and status so they can be tracked in tickets, runbooks, or wikis.

## Victory Doctrine Cheatsheet
- **Priorities:** risk reduction → speed → cost → elegance.
- **Outputs we value:** decision-grade artifacts (plans, rules, checklists, playbooks), not open-ended analysis.
- **Guardrails:** synthetic/defensive only; no real exploitation or non-public data sourcing.
- **Review checklist:** Does the output map to concrete actions, owners, timeboxes, and measurable outcomes? Is PCA present?

## Mode Reference (keep prompts defensive)
- **[MODE: WHITE]** governance, policy, and planning outputs.
- **[MODE: BLUE]** detection, response, and defensive engineering.
- **[MODE: PURPLE]** tabletop and emulation planning (synthetic only).
- **[MODE: GOLD]** lawful financial-intel style risk briefs without non-public data.

## How to Run These Prompts (fast loop)
1. **Select scope:** Pick the template that matches the mission; start with Template 1 or 2 for systemic wins.
2. **Pre-fill context:** Add stack, data classes, maturity, constraints, and actors so the model anchors to your reality.
3. **State the outputs:** Copy the "Required Outputs" verbatim so omissions are obvious in the response.
4. **Ask for PCA:** Require assumptions, uncertainties, and confidence so you can spot weak links.
5. **Review against the quality bar:** Check owners, timeboxes, and measurables before accepting.
6. **Store and route:** File outputs in your wiki/ticket system with owners and due dates; link to dashboards or detections created.

## Output Validation Checklist
- ✅ Mission addressed and mapped to specific actions.
- ✅ Owners and timeboxes are present; effort and impact are explicit.
- ✅ PCA lists assumptions, gaps, and confidence.
- ✅ Defensive guardrails respected (no real exploitation, no non-public sourcing).
- ✅ Success metrics or KRIs/KPIs are stated and linked to the Victory Doctrine.

## Filling the Placeholders (minimum viable detail)
- **Environment:** Stack, identity, endpoint, data stores, deployment model (cloud/on-prem), and key SaaS apps.
- **Data:** Critical classes (PII/PHI/payments/source), where they live, and blast radius considerations.
- **Maturity:** Current capability level, monitoring coverage, and known tooling gaps.
- **Constraints:** Team size, SLOs/SLAs, regulatory regimes, and budget/time limits.
- **Threat model:** Likely actors, business impacts, and favorite kill-chains/TTPs for your environment.

### Optional Fields to Increase Fidelity
- **Regulatory hooks:** HIPAA/PCI/GDPR lenses to ensure controls align with obligations.
- **Dependencies:** Third parties, identity boundaries, and data pipelines that change the blast radius.
- **Change cadence:** Release schedules and deployment methods to time control rollout.
- **Known gaps:** Telemetry blind spots, missing baselines, or manual steps that add fragility.
- **Constraints:** Budget ceilings, staffing limits, or freeze periods that shape feasibility.

## Templates

### 1) Org Top-Risk Map & 90-Day Victory Plan
> Act in [MODE: WHITE+BLUE].
> Mission: Build a **top-risk map and 90-day Victory Plan** for my organization.
>
> **Environment**
>
> * Org type: `<SaaS / fintech / infra / etc>`
> * Stack: `<clouds, IdP, endpoint, data stores>`
> * Data classes: `<PII, PHI, payments, source code, etc>`
>
> **Context**
>
> * Current maturity: `<very low / low / medium / high>`
> * Known issues or past incidents: `<brief bullets>`
>
> **Threat Model (initial guess)**
>
> * Primary actors: `<e.g., BEC crews, ransomware gangs, insider risk, fraudsters>`
> * Most concerning business impacts: `<e.g., account takeover, data theft, fraud>`
>
> **Required Outputs**
>
> 1. Top **5–10 risks** with likelihood × impact and plain-English descriptions.
> 2. A **90-day Victory Plan**: sequenced initiatives with owner, effort, and impact.
> 3. A minimal **Scorecard** (KPIs/KRIs) to track progress.
> 4. A concise **Proof-Carrying Analysis** section with assumptions & uncertainties.
>
> Apply my Victory Doctrine (risk reduction > speed > cost > elegance) and focus on **cheap, fast, high-impact controls** first.

### 2) Detection Coverage Plan for a Specific TTP / Kill Chain
> Act in [MODE: BLUE].
> Mission: Design **detections and telemetry** for the following TTP / scenario:
>
> * Scenario name: `<e.g., Okta session hijack, MFA fatigue, vendor email compromise>`
> * Environment: `<IdP, EDR, SIEM, EKS/K8s, SaaS apps>`
> * Existing tools/logs: `<what we already have>`
>
> **Required Outputs**
>
> 1. A short **kill-chain / attack flow** tailored to my stack.
> 2. A **detections matrix**: for each step, proposed log sources + detection ideas.
> 3. 3–5 **concrete detection rules** (Sigma-style pseudocode is fine).
> 4. Recommended **dashboards/alerts** and key fields to log.
> 5. A **phased rollout plan** (MVP vs advanced) with FP/FR watch-outs.
>
> Optimize to reduce **time to detect/respond** with minimal engineering lift.

### 3) Incident Response Mini-Playbook for Scenario X
> Act in [MODE: BLUE].
> Mission: Create a **lean IR playbook** for this scenario: `<e.g., suspected BEC, stolen laptop, suspicious OAuth app, ransomware on a single host>`.
>
> **Environment**
>
> * Org size: `<small / mid / large>`
> * Key systems: `<IdP, email, EDR, ticketing, comms tools>`
> * Who is on call: `<roles, not names>`
>
> **Required Outputs**
>
> 1. A **stepwise playbook** with phases: Detect → Triage → Contain → Eradicate → Recover → Lessons.
> 2. A simple **RACI** (who does what) using generic roles.
> 3. **Evidence handling** checklist (what to capture, where, how).
> 4. 2–3 **communication templates** (internal exec, impacted employees, third parties).
> 5. “Regression risks & watchouts” for over-reaction or under-reaction.
>
> Keep it 2–3 pages max and executable by a small team.

### 4) Vulnerability Management Triage & SLAs
> Act in [MODE: BLUE+WHITE].
> Mission: Design a **vulnerability triage model and SLA scheme** for my environment.
>
> **Environment**
>
> * Assets: `<web apps, APIs, mobile, infra, endpoints>`
> * Tools: `<scanner(s), ticketing, CMDB yes/no>`
> * Constraints: `<team size, release cadence, regulatory regimes if any>`
>
> **Required Outputs**
>
> 1. A **severity model** (how we turn scanner findings into business risk).
> 2. Clear **SLAs** per severity and asset class (with rationale).
> 3. A proposed **intake & triage workflow** (who reviews, how, when).
> 4. A starter **risk ledger entry format** for exceptions and accepted risks.
> 5. Suggestions for 3–5 **quick automations** (e.g., tagging, routing, reporting).

### 5) Counterparty / Vendor Risk (FinIntel-Defensive)
> Act in [MODE: GOLD+WHITE].
> Mission: Produce a **defensive FinIntel-style vendor/counterparty risk brief** using only lawful public information.
>
> **Target**
>
> * Name: `<entity>`
> * Relationship: `<cloud vendor, payments processor, major customer, etc>`
> * Geography / sectors: `<details>`
>
> **Required Outputs**
>
> 1. High-level **exposure summary**: where this entity touches our risk surface.
> 2. Public-source indicators of **financial stress / sanctions / enforcement actions** (no non-public data).
> 3. A **risk narrative** (low/med/high) with clear drivers.
> 4. Suggested **controls and monitoring** before or during engagement.
> 5. A **PCA** section with source list, gaps, and how often to refresh.

### 6) Security Policy/Standard + OPA/ABAC Skeleton
> Act in [MODE: WHITE].
> Mission: Draft a **security policy/standard** and a corresponding **OPA/ABAC policy skeleton** for: `<e.g., production access, break-glass, secrets management, data access for analysts>`.
>
> **Environment**
>
> * Tech: `<clouds, IdP, CI/CD, data platform>`
> * Org style: `<lean startup / regulated / enterprise>`
>
> **Required Outputs**
>
> 1. A concise **policy text** (1–2 pages) in plain English.
> 2. A minimal **control checklist** that auditors could test.
> 3. An **OPA-style input contract** and example rules (deny-by-default).
> 4. 3–5 **unit test examples** for those rules.
> 5. A short **mapping** to NIST 800-53 / ISO 27001 / SOC2 where relevant.

### 7) Misinformation / Comms Hygiene Playbook
> Act in [MODE: WHITE].
> Mission: Create a **misinformation resilience & comms hygiene playbook** for my org.
>
> **Context**
>
> * Surfaces: `<social, support, sales, public docs>`
> * Concerns: `<brand impersonation, fake incidents, scam campaigns, etc>`
>
> **Required Outputs**
>
> 1. Likely **misinformation scenarios** tailored to us.
> 2. **Detection & triage** guidance (what to monitor, signals of seriousness).
> 3. A basic **response protocol** (who speaks, what channels, timing).
> 4. **Do’s and don’ts** for employees on public platforms.
> 5. Suggestions for **low-cost monitoring** and training.

### 8) Adversary-Emulation Tabletop Scenario
> Act in [MODE: PURPLE].
> Mission: Design an **adversary-emulation tabletop exercise** (synthetic only, no real exploitation) for this scenario: `<e.g., insider data exfil, ransomware in one region, supply-chain compromise>`.
>
> **Environment**
>
> * Key systems and teams involved: `<infra, app, security, legal, comms>`
>
> **Required Outputs**
>
> 1. A **scenario narrative** with 3–5 injects over time.
> 2. For each inject: expected **decisions, data needed, and likely failure modes**.
> 3. A **scorecard** to rate detection, comms, decision-making, and documentation.
> 4. Guidance on how to run the tabletop in **90–120 minutes**.
> 5. A template for **capturing outcomes and follow-up actions**.

### 9) Security Metrics & Scorecard Design
> Act in [MODE: WHITE].
> Mission: Design a **security scorecard** that matches my Victory Doctrine (risk reduction, time metrics, control efficacy, compliance, adversary economics, mission outcomes).
>
> **Context**
>
> * Org size & leadership’s attention span: `<e.g., 15-min monthly review>`
> * Key business outcomes: `<SLOs, fraud limits, etc>`
>
> **Required Outputs**
>
> 1. 8–15 **candidate metrics** grouped by theme.
> 2. A suggested **1-page dashboard layout**.
> 3. Guidance on **data sources**, update frequency, and owners.
> 4. A short note on **anti-gaming / Goodhart’s Law** concerns.

### 10) Risk Ledger Entries for a Specific Project / Change
> Act in [MODE: WHITE+BLUE].
> Mission: Create **risk ledger entries** for this project/change: `<e.g., new AI feature, new 3rd-party integration, deprecating VPN, enabling BYOD>`.
>
> **Project Context**
>
> * Summary: `<1–2 sentences>`
> * Timeline: `<start, target launch>`
> * Data and systems touched: `<high-level>`
>
> **Required Outputs**
>
> 1. 5–15 **risk entries**, each with: ID, description, driver, likelihood, impact, owner, proposed treatment.
> 2. A suggested **categorization scheme** (e.g., data, identity, infra, vendor, fraud).
> 3. Suggested **accept/mitigate/transfer/avoid** decisions with rationale.
> 4. A **mini Victory Plan** for the top 3 risks (concrete actions + success criteria).

## Ready-to-Use Filled Examples (copy/paste then adjust)

**Template 1 (risk map) starter**
```
Act in [MODE: WHITE+BLUE]. Mission: Build a top-risk map and 90-day Victory Plan for a SaaS company.
Environment: Okta + Google Workspace, AWS EKS + RDS, CrowdStrike, Snowflake; data = PII + source code.
Context: medium maturity; recent issues: vendor OAuth app sprawl, stale admin accounts.
Threat model: BEC crews targeting finance, MFA fatigue; impacts: wire fraud, data exfil, customer disruption.
Outputs: top 8 risks with likelihood/impact; 90-day plan with owners/effort/impact; scorecard; PCA.
```

**Template 2 (detection coverage) starter**
```
Act in [MODE: BLUE]. Scenario: Okta session hijack using stolen cookies.
Environment: Okta + CrowdStrike + AWS CloudTrail + Snowflake; SIEM = Splunk.
Existing logs: Okta system/security events, CrowdStrike auth, AWS CloudTrail, Snowflake access history.
Outputs: kill-chain, detection matrix, 4 rules (Sigma-style), dashboards/alerts, phased rollout (MVP vs advanced) with FP/FR watch-outs.
```

**Template 3 (IR playbook) starter**
```
Act in [MODE: BLUE]. Scenario: suspicious OAuth app with overbroad scopes.
Environment: Okta, Google Workspace, Slack, ticketing = Jira; EDR = CrowdStrike.
Who is on call: security on-call analyst, IT admin, comms lead, legal advisor.
Outputs: stepwise playbook, RACI, evidence checklist (tokens, consent logs), comms templates, regression risks.
```

**Template 5 (vendor risk brief) starter**
```
Act in [MODE: GOLD+WHITE]. Target: regional payments processor.
Relationship: critical PSP for card-not-present flows; sectors: EU retail; geography: EU/UK.
Outputs: exposure summary (payments + settlement files), public indicators of financial stress/sanctions, risk narrative, controls/monitoring, PCA with refresh cadence.
```

## Victory Scorecard Starter (paste into wiki/ticket)
- **Risk reduction:** % of top risks with treatments in-flight or closed; residual risk trend.
- **Time metrics:** MTTD/MTTR for top TTPs; mean time to ship mitigations.
- **Control efficacy:** Alert precision/recall or FP/FR notes for shipped detections; playbook success rate.
- **Compliance/coverage:** % assets with SLA-aligned patching; % vendors with current risk briefs.
- **Adversary economics:** Estimated cost/time increase for attacker steps after control rollout.
- **Mission outcomes:** Business SLO alignment (e.g., payment success, uptime, fraud loss thresholds).

## Quality Bar and Anti-Patterns
- **Concrete over abstract:** Favor actions, owners, and timeboxes over generic advice.
- **Coverage mapping:** Each output should trace back to a mission/threat actor/impact; flag gaps explicitly.
- **Economy:** Highlight cheap, fast controls first; defer elegance/refactors unless risk-blocking.
- **No-go zones:** Avoid real exploitation, production changes without approval, or sourcing non-public data.

## Proof-Carrying Analysis
- **Assumptions:** Operators can fill in placeholders accurately and prefer defensive/governance outputs. Templates are neutral to stack size/regulatory regime and may need tailoring.
- **Sources:** Derived from the Dirk IG Victory Doctrine and common defensive workflows; no non-public data required.
- **Uncertainties:** Stack specifics, regulatory obligations, and team capacity may change output emphasis. Extend prompts with org-specific fields (e.g., DPO review) as needed.

## Next Steps
- Store filled-in versions by team/use case in your internal wiki.
- Track outcomes with a simple scorecard for risk reduction, time to detect/respond, and control efficacy.
