# Merge Train Tracker

**Date:** October 2025
**Status:** Active
**Maintainer:** Jules

This document tracks the single merge train established to reduce PR noise and ensure safe landing of critical P0/P1 changes.

## Merge Order

### 1. GA/CI Gate Unblockers
*Status: Critical Path*

| PR (Proxy) | Scope | Risk | Verification | Owner |
| :--- | :--- | :--- | :--- | :--- |
| `recreate/pr-15376-ga-rails` | GA Rails / CI Hardening | High (Blocker) | `Verify CI passes` | Jules |

### 2. P0 Security
*Status: High Priority*

| PR (Proxy) | Scope | Risk | Verification | Owner |
| :--- | :--- | :--- | :--- | :--- |
| `sentinel/fix-ssrf-webhooks` | SSRF Fix for Webhooks | Med | `Security scan` | Jules |
| `sentinel/fix-webhook-signature` | Webhook Signature Fix | Med | `Security scan` | Jules |
| `security-cleanup-hardening` | General Hardening | Low | `CI` | Jules |

### 3. Release Safety / Governance
*Status: Required for Release*

| PR (Proxy) | Scope | Risk | Verification | Owner |
| :--- | :--- | :--- | :--- | :--- |
| `recreate/pr-15378-triage-automation` | Triage Automation | Low | `Manual test` | Jules |
| `recreate/pr-15546-dry-run-release` | Dry Run Release Logic | Med | `Dry run script` | Jules |
| `recreate/pr-15547-channel-classification` | Channel Classification | Low | `Unit tests` | Jules |

### 4. Reliability / Infra
*Status: Stabilization*

| PR (Proxy) | Scope | Risk | Verification | Owner |
| :--- | :--- | :--- | :--- | :--- |
| `recreate/pr-15564-roadmap-ownership` | Roadmap Ownership | Low | `Docs check` | Jules |

### 5. Observability / UX / Docs
*Status: Polish*

| PR (Proxy) | Scope | Risk | Verification | Owner |
| :--- | :--- | :--- | :--- | :--- |
| `recreate/pr-15519-global-search-a11y` | Global Search A11y | Low | `Frontend tests` | Jules |
| `recreate/pr-15379-admin-config` | Admin Config UX | Low | `Frontend tests` | Jules |
| `recreate/pr-15456-doc-review-playbook` | Doc Review Playbook | None | `Review` | Jules |

---

## De-duplication & consolidation

The following PRs (branches) have been identified as duplicates or superseded and should be closed.

| Superseded PR/Branch | Canonical PR/Branch | Reason |
| :--- | :--- | :--- |
| `recreate/pr-15374-global-search-a11y` | `recreate/pr-15519-global-search-a11y` | Older duplicate. |
| `salvage/pr-15546-dry-run-release` | `recreate/pr-15546-dry-run-release` | Superseded by recreate branch. |
| `salvage/pr-15633-release-channel-policy` | `recreate/pr-15547-channel-classification` | Overlapping scope, prefer classification. |
| `recreate/pr-15519-global-search-a11y` | *Self (Canonical)* | Kept as canonical. |

## Execution Instructions

1.  **Checkout** the canonical branch.
2.  **Rebase** on `main`.
3.  **Verify** CI is green.
4.  **Merge** via squash.
5.  **Proceed** to the next item in the train.

*Note: Due to sandbox limitations, PR numbers are inferred from branch names. Please map to actual GH PRs accordingly.*
