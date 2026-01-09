# Promotion Governance

This document outlines the governance model for release promotion in the Summit platform.

## Overview

Release promotion is governed by a policy-as-code mechanism that enforces:
1.  **Required Approvals**: Specific roles/teams must approve promotions to sensitive environments.
2.  **Change Windows**: Promotions to production are restricted to specific days and times to minimize risk.
3.  **Separation of Duties**: The person promoting cannot always check their own work.
4.  **Machine Verification**: All policy checks are automated and produce an immutable decision record.

## Policy Definition

The active policy is defined in `policies/promotion-policy.yml`.

### Key Rules

-   **Production**:
    -   Requires 2 approvals from `release-engineering` or `security-approvers`.
    -   Self-approval is disabled.
    -   Change Window: Mon-Thu, 09:00 - 17:00 UTC.
    -   Required Checks: "Release Promotion Guard", "CI Core", "Security Scan".

-   **Staging**:
    -   Requires 1 approval.
    -   Self-approval is allowed.

### Emergency Overrides

In case of a critical incident requiring out-of-band promotion (e.g., hotfix outside business hours), the **Emergency Override** path can be used.

1.  **Trigger**: Use the `emergency_override` input in the promotion workflow.
2.  **Requirements**:
    -   Must provide a justification.
    -   Requires additional approvals (defined in policy, e.g., 3 approvals).
    -   The override is logged in the decision record.

## Decision Record

Every promotion attempt generates a `promotion-decision.json` artifact. This file contains:
-   **Verdict**: `ALLOW` or `DENY`.
-   **Reasons**: Detailed breakdown of why the decision was made.
-   **Evidence**: Links to the release manifest, commit SHA, and workflow run.
-   **Approvers**: List of users who approved the promotion.

This record is cryptographically tied to the release manifest and stored as a build artifact for audit purposes.

## How to Modify the Policy

1.  Create a PR modifying `policies/promotion-policy.yml`.
2.  The CI will validate the schema (`pnpm policy:promotion:validate`).
3.  Reviewers from `release-engineering` and `security` must approve the PR.
4.  Once merged, the new policy takes effect immediately for subsequent promotions.

## Local Evaluation

To test the policy locally against a mock context:

```bash
pnpm policy:promotion:evaluate
```

This will run the evaluation script in simulation mode.
