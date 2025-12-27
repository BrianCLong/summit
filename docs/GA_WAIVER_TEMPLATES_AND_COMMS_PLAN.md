# GA Waiver Templates, SOC Control Checklist, and Communications Plan

This document provides ready-to-use waiver templates, a SOC-style control checklist, and a detailed communications plan to support MVP-3 GA readiness and audits.

## 1. Waiver Templates

Use waivers sparingly. Each waiver must include an expiry date, scope, mitigation, and explicit human approver. Store executed waivers in `audit/waivers/` with filenames `YYYYMMDD-waiver-<area>.md`.

**Waiver lifecycle (enforceable workflow)**

1. **Intake**: DRI submits a draft waiver using the relevant template with risk score and compensating controls filled in.
2. **Triage**: Governance/Compliance reviews for completeness; incomplete submissions are rejected, not iterated in-line.
3. **Approval**: Release Captain (or delegate) signs off; approval is logged to `audit/waivers/ledger.csv` with timestamp and hash of the waiver file.
4. **Activation**: Mitigations and monitoring are enabled before the waiver is considered active. CI must link to the activation log.
5. **Verification**: Evidence of mitigations working (CI run, manual checklists) is attached within 24h of activation.
6. **Expiry/Revoke**: Auto-expire at the stated date; revocation requires a closing note and confirmation the original gate is restored.
7. **Post-mortem**: For Critical/High waivers, produce a 1-page RCA within 72h to prevent repeat exceptions.

**Waiver governance rules**

- Waivers are **exceptions of last resort**, not scheduling tools. Use only when a GA gate blocks a critical fix or operational continuity.
- All waivers must include a **risk score (Low/Med/High/Critical)** and **compensating controls** that measurably reduce the risk.
- **Auto-expire** waivers at the stated expiry; they cannot be extended without a new approval and updated evidence trail.
- Maintain a **waiver ledger** in `audit/waivers/ledger.csv` (see template below) and link every waiver to CI runs or manual validation logs.
- The **Release Captain** is the final approver for GA-blocking waivers; functional DRIs may co-approve but cannot bypass Release Captain sign-off.

**Waiver ledger template (`audit/waivers/ledger.csv`)**

```csv
id,title,area,risk,owner,approver,created,expires,status,compensating_controls,verification_links
WAIVER-GOV-0001,Governance verdict missing on legacy path,governance,High,alice@example.com,release-captain@example.com,2025-12-27,2026-01-03,Active,"Temporary deny-all on path; manual QA on batch outputs",https://ci.example.com/run/123
```

**Minimum viable evidence for any waiver**

- Link to **CI run or manual validation** proving compensating controls are live (screenshots are insufficient alone).
- **Hash of the waiver file** (e.g., `sha256sum audit/waivers/20261227-waiver-gov.md`) stored in the ledger to detect tampering.
- **Monitoring hook**: alert configured for the waived surface (e.g., Slack webhook, PagerDuty service) with a screenshot or log excerpt.
- **Owner attestation** that mitigations were verified in the environment(s) affected.

**Example filled waiver (markdown)**

```markdown
Title: Governance/Safety Waiver — Legacy ingestion path
ID: WAIVER-GOV-0007
Scope: Legacy ingestion pipeline `/v1/ingest` affecting partner feeds A/B
Risk: Governance verdict emitted late in pipeline; risk of unreviewed advisory output
Mitigation: Temporary deny-all policy on `legacy_ingest` role; runtime assertion to block advisory responses lacking verdict
Risk Score: High
Expiry: 2026-01-05 (auto-revoke); reminder at T-48h
Owner/Approver: Jane Smith (Governance DRI); Final Approver: Alex Kim (Release Captain)
Review Cadence: Every 48h or after any deploy touching ingestion
Rollback Plan: Enable new verdict middleware; remove deny-all override; rerun `pnpm test governance`
Evidence: CI run #4582 governance suite; log of denied advisory attempts; manual QA checklist
```

**Risk scoring rubric (use consistently across all waivers)**

- **Critical**: Potential for safety, governance, or data truth failure affecting production customers with no automated rollback.
- **High**: Policy degradation or missing guardrails with compensating controls available and validated.
- **Medium**: Limited blast radius, strong compensating controls, rapid rollback path (<30 minutes).
- **Low**: Non-user-facing impact, redundant controls present, monitored with auto-expiry ≤7 days.

### 1.1 Governance or Safety Waiver

```
Title: Governance/Safety Waiver — <area>
ID: WAIVER-GOV-<####>
Scope: <describe system, service, or path>
Risk: <governance constraint being waived and potential impact>
Mitigation: <temporary controls; monitoring/alerting added>
Expiry: <date or condition; default 14 days>
Owner/Approver: <human DRI + role>
Review Cadence: <e.g., every 48h>
Rollback Plan: <steps to restore full enforcement>
Evidence: <links to policies, tests, and logs>
```

### 1.2 CI/Test Waiver

```
Title: CI/Test Waiver — <check>
ID: WAIVER-CI-<####>
Scope: <pipelines, checks, repos affected>
Risk: <impact of skipped or flaky check>
Mitigation: <manual validation steps and compensating controls>
Risk Score: <Low/Med/High/Critical>
Expiry: <date; default 7 days>
Owner/Approver: <human DRI + role>
Verification: <command list run manually>
Rollback Plan: <re-enable gate and re-run affected pipelines>
Evidence: <links to CI runs and logs>
```

### 1.3 Data Provenance Waiver

```
Title: Data Provenance Waiver — <dataset/service>
ID: WAIVER-PROV-<####>
Scope: <APIs/exports where provenance is temporarily incomplete>
Risk: <chance of demo/simulated data appearing as real; downstream effects>
Mitigation: <UI red-labeling, export blocking, manual reviews>
Risk Score: <Low/Med/High/Critical>
Expiry: <date; default 7 days>
Owner/Approver: <human DRI + role>
Monitoring: <alerts or reports to detect leakage>
Rollback Plan: <restore mandatory provenance fields; re-run truth tests>
Evidence: <schema diffs, test logs>
```

**Verification cadence for all waivers**

- **Daily dashboard check**: Ensure compensating controls are active and producing expected signals.
- **CI linkage**: Attach at least one CI run or manual verification log proving the waiver’s mitigation is active.
- **Closure protocol**: When closing a waiver, include before/after evidence, date closed, and confirmation that underlying GA gate is restored.

**Automation hooks (recommended but enforceable in CI)**

- **Expiry sweeper**: Schedule `scripts/waiver_expiry_guard.sh` (or equivalent) hourly to fail CI/merge if any waiver is expired or lacks evidence. Gate should run on `main` and PR branches.
- **Ledger linter**: Add a lint step that enforces the CSV header, validates risk values (`Low|Med|High|Critical`), and verifies SHA hashes referenced in the ledger.
- **Alerting**: Emit Slack/PagerDuty alerts at T-48h and T-24h prior to expiry with the waiver ID, owner, and required remediation steps.
- **Evidence bundling**: On every release candidate build, bundle active waivers and their evidence into `audit/ga-evidence/waivers-<build>.zip` for auditors.

## 2. SOC-Style Control Checklist (Trust Services Criteria)

Track GA control coverage against SOC 2 TSC. Owners must update status before release.

| Control Area                        | SOC 2 TSC                             | Control Description                                                                       | Owner            | Evidence                                | Status                                 |
| ----------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------- | --------------------------------------- | -------------------------------------- |
| Governance verdict mandatory        | Security                              | All outputs emit governance verdict; bypass tests block CI                                | Governance Lead  | `policies/`, `ga-gates` CI logs         | ☐ Not started ☐ In progress ☑ Complete |
| Provenance enforced end-to-end      | Processing Integrity, Confidentiality | Provenance/confidence required in APIs, UI blocks unlabeled data, exports include verdict | Data Lead        | API schemas, UI tests, export snapshots | ☐ Not started ☐ In progress ☑ Complete |
| API versioning & schema diff        | Availability, Processing Integrity    | Versioned namespaces; schema snapshots diffed in CI; breaking change requires bump        | Platform Lead    | Schema snapshots, CI diff logs          | ☐ Not started ☐ In progress ☑ Complete |
| Full typecheck + lint gates         | Security, Processing Integrity        | `pnpm lint` + `pnpm typecheck` block merges; no unjustified suppressions                  | Eng Productivity | CI runs, suppression waiver logs        | ☐ Not started ☐ In progress ☑ Complete |
| Governance regression suite         | Security                              | Tests attempt imperative/overconfidence/bypass; CI fails on erosion                       | Governance QA    | Test reports                            | ☐ Not started ☐ In progress ☑ Complete |
| Threat models & mitigations         | Security, Confidentiality             | Threat models per subsystem with mitigation mapping and review log                        | Security Lead    | Threat model docs, review minutes       | ☐ Not started ☐ In progress ☑ Complete |
| Unified logging & tracing           | Availability, Security                | Correlation IDs across services; operator dashboard for incident triage                   | SRE Lead         | Logging schema, dashboard screenshots   | ☐ Not started ☐ In progress ☑ Complete |
| GA documentation & non-capabilities | All                                   | GA docs, architecture, governance, and explicit non-capabilities published                | Docs Lead        | GA docs, release notes                  | ☐ Not started ☐ In progress ☑ Complete |

## 3. Communications Plan (GA Launch)

Audience-segmented plan aligned to release day. Maintain artifacts in `audit/ga-evidence/` and `docs/`.

### 3.1 Timeline & Cadence

- **T-14 days**: Finalize threat models, governance regression results, and provenance snapshots. Draft announcement and FAQs. Prepare incident playbook excerpt for customer support.
- **T-7 days**: Dry run of CI hard-gates; publish waiver log (expected to be empty) to `audit/ga-evidence/`. Brief execs and support leads.
- **T-2 days**: Lock schemas; freeze non-critical merges. Capture final GA evidence bundle and operator dashboard screenshots.
- **T-0 (Launch)**: Release GA announcement (blog/email), update status page, and attach GA evidence summary. Enable GA workflow gates in `main`.
- **T+7 days**: Post-launch review, incident retrospective (if any), and audit packet refresh.

### 3.2 Channels & Owners

- **Customers/Users**: Email + in-product banner. **Owner:** PMM. Content: GA summary, governance guarantees, data honesty statement, support paths.
- **Engineering/Internal**: Slack + runbook update. **Owner:** Release Captain. Content: merge-freeze status, rollback plan, checklist links.
- **Executives/Board**: PDF memo + meeting. **Owner:** CTO. Content: GA criteria met, SOC 2 alignment, risk register, open waivers (ideally none).
- **Auditors/Compliance**: Evidence bundle handoff. **Owner:** Compliance Lead. Content: control checklist, threat models, CI gate logs, waiver ledger.
- **CS/Sales**: Battlecard + objection handling sheet. **Owner:** Sales Engineering Lead. Content: validated claims, supported use cases, escalation paths.

### 3.3 Key Messages (Defensible Claims)

- Governance is default-on and structurally enforced; every output has a verdict with reasons.
- Data honesty is provable: provenance/confidence on APIs, UI, and exports; demo data cannot appear as real.
- CI green equals merge-safe: lint, typecheck, governance regression, provenance checks, schema diffs, threat-model presence.
- Operators can diagnose incidents without developers thanks to unified logging, tracing, and dashboards.

### 3.4 Rollback & Incident Messaging

- **Rollback trigger:** Governance regression, provenance leakage, or failed GA gate post-launch.
- **Action:** Revert to last GA-tagged release, re-enable stricter CI gates, broadcast rollback across channels.
- **Messaging:** Transparently state issue, user impact, expected recovery time, and mitigation steps. Provide follow-up RCA within 48 hours.

**Post-incident communication packet**

- Incident summary (timeline, blast radius, user impact)
- Governance/provenance impact statement
- Actions taken and remaining risks
- Follow-up items with owners and due dates

**Channel-ready templates (edit per incident/release)**

- **Customer email/status page**: "We detected an issue affecting <scope>. Governance and provenance protections remained <intact/degraded>. We have <rolled back to version X|applied fix Y>. No action is required from you. Next update at <time>."
- **Internal engineering Slack**: "[SEV#:P0-P2] <short description>. Rollback trigger? <yes/no>. On-call: <name>. Next milestone: <timestamp>. Link to dashboard: <URL>."
- **Board/exec memo (1–2 paragraphs)**: Concise description of impact, user-visible effects, mitigation, remaining risk, and expected resolution ETA.
- **Audit note**: Include waiver state (ideally none), CI gate status, and whether any governance or provenance commitments were affected.

### 3.5 Success Metrics & Monitoring

- Zero open waivers at launch; waivers auto-expire and alert at T-24h.
- 100% of GA gates green on launch day and T+7 review.
- Time-to-diagnose P0 incident ≤ 15 minutes with operator dashboard alone.
- No unlabeled simulated data in production logs or exports.
- Post-incident RCA published within 48h for any GA gate regression.

### 3.6 Appendices

- **Templates location:** `audit/waivers/` (waivers), `audit/ga-evidence/` (evidence bundles), `docs/` (public-facing artifacts).
- **Change control:** Updates to this plan require Release Captain approval and must be recorded in the GA evidence bundle.
