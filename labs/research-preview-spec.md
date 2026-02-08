# Summit Labs Research Preview Spec

## Purpose

Research Preview is a first-class product stage that exposes frontier
capabilities to limited tenants under strict governance controls.

## Required Labels

- **Preview badge** in UI and documentation.
- **Tenant allowlist** and access justification.
- **Kill-switch** with documented on-call ownership.

## Telemetry & Safety

- **Mandatory telemetry**: task success, latency, cost, and policy decisions.
- **Safety monitoring**: policy violations, escalation triggers, and rollback
  thresholds.
- **Data minimization**: document retained fields and retention windows.

## Governance Controls

- Policy-as-code enforcement for tool access.
- Evidence bundle for every promotion request.
- Governed Exceptions register for any bypasses.

## Promotion Path

Research Preview promotes only when all Preview → Beta gates are met.
