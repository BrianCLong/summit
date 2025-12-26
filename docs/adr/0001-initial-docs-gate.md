# 0001: Establish Docs-as-Code Gate

* Status: Accepted
* Date: 2025-12-23

## Context

Critical paths such as security, export, policy, privacy, and API surfaces require synchronized documentation to remain auditable.

## Decision

Introduce a documentation gate that requires either docs updates, an ADR entry, or an explicit override label when code touches protected paths.

## Consequences

* Pros: encourages traceability and reduces drift between implementation and docs.
* Cons: adds a small amount of PR ceremony when touching regulated areas.
