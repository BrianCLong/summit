Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Anti-Fragmentation & Fork Defense

**Mission**: Prevent Summit from splintering into parallel or divergent implementations.

## The Threat of Fragmentation

Fragmentation dilutes strategic gravity, increases maintenance burden, and creates security gaps.
"Parallel Summits" occur when:

- Teams bypass the central control plane.
- "Temporary" forks become permanent.
- Features are implemented in absorbed systems instead of the Core.

## Drift Detection

We must actively detect drift from the Canon.

### Technical Detectors

1.  **Schema Drift**: Monitor database schemas for unauthorized tables or columns.
2.  **Policy Drift**: Alert on services bypassing OPA or using local policy logic.
3.  **Dependency Drift**: Scan for unmanaged or conflicting libraries.
4.  **Shadow APIs**: Detect undocumented API endpoints via traffic analysis.

### Governance Detectors

- **Audit Gaps**: Resources modified without Provenance entries.
- **Maverick Deployments**: Running artifacts not signed by CI/CD.

## Fork Prevention Mechanisms

### 1. The "Golden Path" Incentive

Make the Canonical Path the easiest path.

- **Free Infrastructure**: Core provides free auth, logging, hosting.
- **Developer Experience**: Superior tooling for Canonical modules.

### 2. Contractual & Policy Deterrents

- **"Sunset Clauses"**: Any divergence must have a documented end date.
- **Budget Gating**: Funding is tied to Convergence Metrics.

### 3. Technical Enforcement

- **Signing**: Only signed binaries run in Production.
- **Network Isolation**: Non-compliant services are isolated from the Core Graph.

## Enforcement & Remediation

When drift is detected:

1.  **Alert**: Notify the team and the Governance Council.
2.  **Freeze**: Block further deployments until drift is addressed.
3.  **Absorb or Expel**: Force convergence or decommission the rogue system.
