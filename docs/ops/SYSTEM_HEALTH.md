# System Health & Invariants Dashboard

## Overview

The System Health dashboard provides operators with a real-time view of the system's operational status, including safety mechanisms, invariant violations, and policy enforcement.

## Endpoints

### GET /ops/system-health

Returns the current system health status.

**Response:**

```json
{
  "safetyState": {
    "killSwitch": false,
    "safeMode": false
  },
  "invariants": {
    "backpressure": {
      "concurrency": 12,
      "queueDepth": 0,
      "queues": {
        "critical": 0,
        "normal": 0,
        "bestEffort": 0
      }
    },
    "recentViolations": []
  },
  "policyDenials": {
    "count": 5,
    "topRules": [],
    "recent": [
        { "id": "...", "action": "GET /api/restricted", "details": { "status": 403 } }
    ]
  },
  "verificationGates": {
    "sloResults": { ... },
    "gateStatus": "PASS"
  }
}
```

### POST /ops/policy-simulator

Simulates a policy decision without accessing production data (inputs-only).

**Input:**

```json
{
  "subjectTenantId": "tenant-a",
  "resourceTenantId": "tenant-b",
  "action": "read",
  "purpose": "audit",
  "profile": "strict" // Optional: "strict" (default), "balanced", "fast_ops"
}
```

**Response:**

```json
{
  "allow": false,
  "reason": "cross-tenant access denied by base profile",
  "overlaysApplied": [],
  "evaluationPath": [],
  "metadata": {
      "simulationMode": "inputs-only",
      "profileUsed": "base-v1"
  }
}
```

## Runbooks

### Investigating Policy Denials

1. Check `policyDenials.recent` in the `/ops/system-health` output.
2. Identify the `subjectTenantId` and `resourceTenantId` from the audit log details.
3. Use the `/ops/policy-simulator` with the same inputs to reproduce the denial.
4. If the simulator returns `allow` but production denied, check for state-based policies (which are bypassed in simulation) or data drift.

### Handling Backpressure Violations

1. If `invariants.backpressure.queueDepth` is high (> 1000):
   - Check `concurrency` vs `maxConcurrency`.
   - Use `/ops/maintenance` to trigger cleanup if necessary.
   - Consider enabling `safeMode` via feature flags if system is at risk of collapse.
