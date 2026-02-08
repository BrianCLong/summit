# RFC: Systemic Backlog Reduction v0.1

**Status:** Draft
**Author:** Jules (Release Captain)
**Date:** February 8, 2026
**Priority:** High Leverage

## Problem Statement

The current backlog scale creates significant friction for both maintainers and contributors. High triage costs, review drag, and duplicate work are direct consequences of an unmanaged backlog. Large backlogs obscure critical issues, delay urgent fixes, and demotivate the community by making progress feel impossible. Systemic reduction is required to restore project velocity.

## Principles

- **Close by Default**: Unless an issue has an active owner, clear acceptance criteria (AC), and is assigned to a near-term milestone, it should be closed.
- **Consolidate Aggressively**: Duplicates are the enemy of clarity. Merge similar issues into a single source of truth immediately.
- **Label Taxonomy as Control Plane**: Labels are not just metadata; they are the interface for automation and the control plane for project health.
- **Evidence-First Issues**: Issues without reproduction steps, logs, or data-backed evidence are candidates for immediate closure or "Needs-Repro" status.

## Policy

### Criteria for Disposition

- **Close**:
  - No activity for > 60 days without a dedicated owner.
  - Missing reproduction steps or sufficient evidence after 7 days of request.
  - Low-value feature requests that do not align with the current roadmap.
- **Keep**:
  - Active owner assigned and meaningful progress in the last 30 days.
  - Clear acceptance criteria and part of an active milestone.
- **Convert-to-Epic**:
  - Issues that represent broad workstreams rather than discrete tasks.
  - Large features that require multiple PRs and coordinated effort.
- **Merge**:
  - Direct duplicates or overlapping scopes.
- **Needs-Repro**:
  - Valid reports missing sufficient detail to act upon.

## Process

### Weekly Sweep Cadence

A systemic sweep of the backlog will occur weekly to ensure adherence to the policy.

- **Roles**:
  - **Day Captain**: A rotational maintainer role responsible for the weekly triage sweep and initial labeling.
  - **Maintainer**: Final authority on "Close" vs. "Convert-to-Epic" decisions for high-impact issues.
  - **Triage Bot**: Automated assistant that handles stale labeling, initial categorization, and closure of abandoned issues.
- **Definition of "Active"**: An issue is considered active if it has a meaningful comment from a contributor or is assigned to a milestone within the current or next sprint cycle.

## Automation Hooks

### Interface Specifications

- **Labels**:
  - `status/stale`: Automatically applied after 60 days of inactivity.
  - `status/needs-repro`: Applied when evidence is missing.
  - `resolution/duplicate`: Used for merging.
  - `epic-candidate`: Flag for potential epic conversion.
- **GitHub Actions**:
  - **Stale Manager**: Monitors `status/stale` issues and closes them after 7 days of further inactivity.
  - **Template Enforcer**: Validates that new issues contain required sections (e.g., "Reproduction Steps").
- **Bot Comments**:
  - Automated "call for owner" on issues approaching stale status.
  - Standardized closure messages with instructions on how to reopen.

## Metrics

- **Backlog Burn-down**: Track the total count of open issues vs. closed issues weekly.
- **Mean Issue Age**: Average time from creation to resolution/closure.
- **% Issues with Evidence**: Percentage of open issues that meet the "Evidence-First" criteria.
- **Reopen Rate**: Percentage of issues closed by systemic reduction that are subsequently reopened with new evidence.

## Risk + Rollback

### Avoiding Accidental Closures

- **Grace Period**: Issues must be labeled `status/stale` for at least 7 days before automated closure.
- **Human Override**: Any contributor can remove the `status/stale` label by providing a meaningful update.

### Restoration

- **Standard Reopen Policy**: Any closed issue can be reopened if the requester provides the missing reproduction steps or takes ownership of the implementation.
- **Audit Trail**: Every systemic action must be accompanied by a comment explaining the rationale and citing this RFC.

## Appendix

### Example Label Set

| Label                  | Purpose                     |
| ---------------------- | --------------------------- |
| `type/bug`             | Functional defect           |
| `type/feature`         | Enhancement request         |
| `priority/critical`    | Immediate action required   |
| `status/stale`         | No recent activity          |
| `status/needs-repro`   | Awaiting reproduction steps |
| `resolution/duplicate` | Merged into another issue   |

### Closure Comment Templates

> **Stale Closure:**
> "This issue has been closed due to 60 days of inactivity. If this is still relevant, please reopen it with updated information or reproduction steps. See [RFC: Systemic Backlog Reduction v0.1](docs/rfcs/backlog-reduction-v0.1.md) for more context."

> **Missing Evidence Closure:**
> "Closing this issue as it lacks the required reproduction steps/evidence to be actionable. Please feel free to reopen once the necessary details are provided."

## How to Adopt Checklist

- [ ] **Approve RFC**: Stakeholder sign-off on this strategy.
- [ ] **Label Initialization**: Ensure all labels in the "Example Label Set" exist in the repository.
- [ ] **Action Configuration**: Deploy or update GitHub Actions for stale management and template enforcement.
- [ ] **Initial Sweep**: Assign the first Day Captain to perform a manual sweep of all issues > 90 days old.
- [ ] **Documentation Update**: Link this policy in `CONTRIBUTING.md` and issue templates.
