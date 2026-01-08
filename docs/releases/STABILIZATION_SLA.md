# Stabilization SLA & Escalation Policy

This document defines the Service Level Agreements (SLA) for stabilization items and the automated escalation process for overdue items.

## SLA Rules

Priorities have strict due date expectations from the time of issuance (or target date alignment).

| Priority | Due Within | Description |
|---|---|---|
| **P0** | 7 Days | Critical stabilization items blocking release or major functionality. |
| **P1** | 14 Days | High priority items required for stability but not immediate blockers. |
| **P2** | 30 Days | Medium priority improvements and non-critical fixes. |

## Escalation Tiers

Items are automatically classified into tiers based on their due date relative to today.

| Tier | Status | Logic | Action |
|---|---|---|---|
| **T0** | On Track | Due in > 2 days | Normal execution. |
| **T1** | Due Soon | Due in <= 2 days | Owner should prioritize. |
| **T2** | Overdue | Overdue by 1–7 days | Flagged in weekly report. Requires immediate attention. |
| **T3** | Critical Overdue | Overdue by > 7 days | **Escalated**. Requires mitigation plan or blocker resolution. |

**Blocked-Unissued Policy:**
Any item missing a `Target Date`, `Owner`, or `Ticket URL` is classified as **BLOCKED-UNISSUED** and treated as **T3 (Critical Overdue)** until resolved.

## Weekly Escalation Report

A weekly report is generated (Monday 9am UTC) and available in `artifacts/stabilization/escalation.md`.

The report includes:
1. **Summary Counts**: Overview of items by tier.
2. **Blocked-Unissued List**: Items missing critical metadata.
3. **Top Overdue Items**: Ranked list of the most overdue items.

## Issuance Worksheet Guardrails

To ensure data quality, the following rules are enforced in CI for `docs/releases/issuance_worksheet.csv`:

- **DONE Status**: Cannot be set unless `Owner`, `Ticket URL`, and `Evidence Link` are present.

### How to Fix Validation Errors

If your PR fails validation:
1. Check the CI logs for specific row errors.
2. Ensure you have added the required links and owner for any item marked `DONE`.
3. If evidence is pending, keep status as `IN_PROGRESS` or `VERIFYING`.
