# OSINT Privacy & Civil Liberties Controls

## Overview
This document details the privacy controls implemented for OSINT data handling within Summit, aligning with the IC OSINT Strategy's emphasis on privacy and civil liberties.

## Core Principles

1.  **Minimization**: Only collect data necessary for the mission.
2.  **Attribution**: Maintain clear provenance for all data.
3.  **Governance**: Enforce retention and sharing policies via code.

## Data Handling Controls

### 1. PII Flagging
Every OSINT asset must declare `has_pii: boolean`.
- If `true`, a `retention_policy` MUST be specified.
- Assets without this declaration are rejected by the Policy Gate.

### 2. Retention Policies
- **Transient**: Data is processed in memory and not persisted beyond the immediate session.
- **Standard**: Data is retained for a standard period (e.g., 90 days) then purged.
- **Restricted**: Data is retained indefinitely but access is strictly logged and audited.

### 3. Shareability
- **Public**: Safe to share externally (e.g., CC0).
- **Internal**: Internal use only.
- **Restricted**: Need-to-know access only.

## Technical Enforcement
The `osint-policy-gate` (CI job) enforces these rules on all registered assets/fixtures.
Runtime checks in the `CatalogStore` can filter search results based on user clearance/intent (future scope).

## Audit Trail
All access to Restricted assets generates an audit log entry in the `metrics.json` of the consuming process.
