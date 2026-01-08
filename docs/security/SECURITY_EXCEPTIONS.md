# Security Exceptions Registry

## Overview

This document outlines the process for managing security exceptions. It is the single source of truth for understanding how to request, approve, and track waivers for security controls. The canonical registry of all active and expired exceptions is maintained in [`SECURITY_EXCEPTIONS.yml`](./SECURITY_EXCEPTIONS.yml).

This system is designed to provide a formal, auditable, and time-bound process for managing risks, not to create permanent loopholes.

## When to Use a Security Exception

A security exception is required when a security control would otherwise block a critical activity, such as a release or a build, and the underlying issue cannot be remediated immediately. This should be a rare event.

Examples include:

*   A false positive from a security scanner that cannot be suppressed in the tool.
*   A newly discovered vulnerability in a third-party dependency where no patch is yet available.
*   A legacy system that does not meet a new security standard and is on a formal decommissioning path.

## The Exception Lifecycle

### 1. Request

To request an exception, open a pull request that adds a new entry to the `exceptions` list in `docs/security/SECURITY_EXCEPTIONS.yml`. The entry must conform to the schema defined in the file's comments.

### 2. Review and Approval

The pull request must be reviewed and approved by the designated stakeholders. The required approvers depend on the `risk_rating`:

*   **Low/Medium:** Approval from the Security Engineering team is required.
*   **High/Critical:** Approval from the CISO is required.

### 3. Expiry and Reviews

All exceptions **must** have a hard `expires_on` date. There are no permanent exceptions.

*   An exception is considered **invalid** if its `expires_on` date is in the past.
*   The `review_required_by` field can be used to trigger an earlier review cycle before the final expiration.

Expired exceptions will automatically fail any release-intent gating checks.

## Impact on RC/GA Gating

The security exception registry is strictly enforced by the CI/CD pipeline, especially for release candidates (RC) and general availability (GA) releases.

*   **Release-Intent Gating:**
    *   The pipeline will **fail** if any exception in the registry is invalid (e.g., expired or malformed).
    *   For GA releases, the pipeline will **fail** if any active exception has a `risk_rating` of `critical`, unless a specific policy override is in place.
*   **Normal PRs:**
    *   For regular pull requests, the validator will run in a non-blocking mode. It will produce a report and a warning but will not fail the build.

This automated enforcement ensures that security risks are explicitly acknowledged and managed before any release.
