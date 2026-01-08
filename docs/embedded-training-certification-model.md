# Embedded Training & Certification Model v0

## Overview

This model embeds role-specific training, compliance, and certification signals directly into CompanyOS. It uses structured content, policy-linked triggers, and telemetry to keep learning in the flow of work rather than in annual, out-of-context modules.

## Content Types

- **Courses**: 30–60 minute guided paths combining lessons, walkthroughs, and graded quizzes; include policy mappings and completion badges.
- **Micro-lessons**: 2–5 minute targeted snippets (text + short clips/GIFs) optimized for just-in-time delivery; always include 1–2 knowledge checks.
- **Walkthroughs**: Clickable, stepwise overlays tied to UI states and feature flags; include inline definitions of relevant policies/runbooks.
- **Quizzes & simulations**: 3–10 question checks or lightweight sandboxes; must emit structured results (score, attempts, time-to-complete) to the compliance ledger.

## Personas & Tracks

- **Engineers**: Secure coding, data handling, release/rollback, feature flags, infra changes.
- **Operations (SRE/Support)**: Incident response, change management, runbook adherence, escalation.
- **Security**: Vulnerability triage, identity/access controls, audit prep, third-party review.
- **Compliance & Risk**: Policy authorship, control testing, evidence collection, auditor liaison.
- **Partners/Integrators**: API usage, data residency, customer isolation, support expectations.

**Tracks & leveling**

- Each persona has a **Core** (must-complete) and **Advanced** (role- or system-specific) track.
- Completion uses **tiered proficiency**: `Enrolled → Completed (>=80% quiz) → Proficient (scenario/simulation pass) → Certified (time-bounded, e.g., 12 months)`.
- Certifications include **expiry dates** and **scope tags** (e.g., `scope=data-export`, `scope=prod-change`).

## Representation of Completion & Proficiency

- Store results in the compliance ledger with: user, persona, track, module ID, attempt count, score, issued-at, expires-at, scope tags, and evidence links.
- UI surfaces **certification chips** (color-coded by status) next to risky actions; chips show remaining validity.
- APIs expose `isCertified(scope, user)` and `nextRequiredTraining(action)` for gating and tips.

## Embedded Education Patterns

- **Just-in-time tips**: When a user opens a risky or complex feature (e.g., data export, cross-tenant change), show a 2–3 bullet overlay summarizing the policy, plus a link to the micro-lesson. Log impressions and dismissals.
- **Pre-action micro-training gates**: For high-risk actions (prod schema change, bulk export, SSO config), require passing the linked micro-lesson quiz within the last `N` days. Block action until completed; provide an inline launch of the lesson.
- **Policy-to-runbook linking**: Each feature ties to a `policyId` and `runbookId`. The UI shows a 30–60 second explanation with examples and a “view runbook” link. Runbook steps can launch contextual walkthroughs.
- **Adaptive reinforcement**: If telemetry shows repeated near-misses (rollback, alert noise, permissions denied), schedule micro-lessons directly in the workflow (e.g., upon next login or feature entry) with reduced friction.
- **Automated reminders**: Notify users 14/7/1 days before certification expiry with CTA to refresh micro-lesson; block high-risk actions after expiry.

## Governance & Reporting

- **Access gating**: RBAC checks call `isCertified(scope, user)`; gates must be deterministic and log allow/deny with evidence IDs. Examples:
  - Data export requires `scope=data-export` Proficient or higher within 12 months.
  - Production change window requires Ops Core Completed + Advanced Proficient within 9 months.
- **Customer & auditor reporting**:
  - Coverage dashboards: percent trained per persona/track, freshness (avg days to expiry), and exception list (who has access but lacks training).
  - Evidence bundles: exportable CSV/JSON with user, module, score, attempt, expiry, and linked policy/runbook IDs; include signed hash from ledger.
  - Incident linkage: post-incident report shows which users involved were certified for the relevant scope.
- **Content lifecycle**:
  - **Authoring**: owners add `policyId`, `version`, expected outcomes, and telemetry hooks.
  - **Review**: security/compliance review for accuracy; UX review for brevity and clarity; localization review where applicable.
  - **Publication**: versioned with semantic tags; set expiry/refresh cadence (default 12 months; critical policies 6 months or on policy change).
  - **Change management**: when a policy changes, flag dependent lessons, auto-create review tasks, and require learners to re-certify if the change alters scope or controls.

## Artifact: Example Micro-Lesson (Data Export)

- **Title**: "Secure Data Export: Preventing Unauthorized Leakage"
- **Scope tags**: `data-export`, `pii`, `third-party-transfer`
- **Trigger**: User initiates CSV/NDJSON export of customer data or connects a new destination.
- **Objective**: Ensure exports respect tenancy, data minimization, and approval workflows.
- **Prerequisites**: Authenticated user with export capability but lacking current `data-export` certification.
- **Format**: 3-slide overlay + 1-minute GIF showing masked preview; 4-question quiz (must score >=80%).
- **Key content**:
  1. Allowlisted destinations only; personal email/cloud drives are blocked.
  2. Exports must include tenant ID and request ticket number; default columns exclude secrets/credentials.
  3. Dual approval required for cross-tenant exports; all exports are logged to the ledger.
  4. In case of mis-send, trigger "Export Recall" runbook within 15 minutes.
- **Walkthrough hook**: CTA launches in-product walkthrough to configure a compliant export and submit approval.
- **Assessment & signals**:
  - Quiz items map to policy IDs (`POL-DA-003`, `POL-DATA-RES-002`).
  - Results posted to the compliance ledger with expiry in 12 months; UI shows certification chip on success.
  - On failure, block export and surface remediation steps + retry link.

## Artifact: “Training content is ready to ship if…” Checklist

- Content references correct **policyId/runbookId**, version, scope tags, expiry, and owner.
- Micro-lesson length ≤5 minutes; includes at least one quiz or interactive check with pass threshold defined.
- Accessibility: captions for media; keyboard navigation for walkthroughs; localized strings for supported languages.
- Telemetry: impression, completion, score, and expiry events emit to compliance ledger; dashboards updated.
- Access rules configured (who is gated, duration of validity); dry-run mode validated in staging.
- QA complete: reviewed by security/compliance and UX; links tested; rollout plan and fallback documented.
- Evidence export tested (CSV/JSON + signed hash) and attached to change record.
