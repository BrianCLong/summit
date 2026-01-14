# Strict Triage Policy

This policy enforces a strict intake gate for issues. Issues are only triage-ready when the
required intake fields are complete and validated. The automation is the source of truth for
labels and milestones, ensuring consistent classification and auditability.

## Required Intake Fields

All new issues must include the following required fields (via issue forms):

- **Priority** (P0–P3)
- **Area** (server, client, web, cli, ci, docs, governance, security, release)
- **Type** (bug, feature, security)
- **Reproduction steps** (exact steps or validation workflow)
- **Acceptance criteria** (2–5 testable bullets)

If any required field is missing or malformed, the issue is labeled `triage:needs-info` and a
checklist comment is posted. Issues only move to `triage:ready` when all required fields are
complete.

## Label and Milestone Mapping

Automation applies the following labels based on intake fields:

- **Priority → `priority:*`**
  - `P0` → `priority:P0`
  - `P1` → `priority:P1`
  - `P2` → `priority:P2`
  - `P3` → `priority:P3`
- **Area → `area:*`**
- **Type → `type:*`**

Milestones are applied based on priority:

- `priority:P0` or `ga:blocker` → **GA Hard Gate**
- `priority:P1` → **30-Day**
- `priority:P2` → **60-Day**
- `priority:P3` → **Backlog**

If intake is incomplete, managed milestones are cleared until the issue is compliant.

## Restricted Labels

The following labels are automation-owned and reverted if applied outside of the strict gate:

- `priority:P0`
- `priority:P1`
- `ga:blocker`
- `ga:hard-gate`

Only maintainers or automation may apply restricted labels and escalation milestones.

## Compliance Audits

A scheduled audit verifies open issues remain compliant. The auditor:

- Flags missing or malformed intake fields with `triage:needs-info`.
- Posts a deterministic checklist comment (idempotent).
- Keeps labels and milestones aligned with the intake contract.

## Escalation Workflow (Maintainers Only)

Maintainers may use approved workflow commands or direct label edits. Automation will preserve
restricted labels only when applied by maintainers or by the workflow itself.
