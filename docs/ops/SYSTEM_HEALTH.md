# System Health Dashboard

## Overview

The System Health Dashboard provides real-time visibility into platform operational state, including emergency controls and policy simulation capabilities.

## Endpoints

### GET `/ops/system-health`

Returns comprehensive system health status.

**Response:**

```json
{
  "timestamp": "2026-01-05T12:00:00.000Z",
  "killSwitch": {
    "enabled": false,
    "reason": null,
    "enabledAt": null
  },
  "safeMode": {
    "enabled": false,
    "reason": null,
    "enabledAt": null
  },
  "backpressure": {
    "currentConcurrency": 45,
    "maxConcurrency": 100,
    "queueDepth": 120,
    "maxQueueDepth": 1000,
    "isBackpressured": false
  },
  "sloResults": {
    "available": true,
    "path": "/app/dist/slo-results.json"
  },
  "recentPolicyDenials": 3
}
```

### POST `/ops/system-health/kill-switch`

Enable or disable the emergency kill-switch. Requires ADMIN role.

**Request:**

```json
{
  "enabled": true,
  "reason": "Emergency maintenance window"
}
```

**Response:**

```json
{
  "ok": true,
  "killSwitchEnabled": true
}
```

### POST `/ops/system-health/safe-mode`

Enable or disable safe-mode (reduced functionality). Requires ADMIN role.

**Request:**

```json
{
  "enabled": true,
  "reason": "High error rate detected"
}
```

### POST `/ops/policy-simulator`

Simulate policy decisions without affecting production state. Requires ADMIN or OPERATOR role.

**Request:**

```json
{
  "action": "read",
  "resource": "investigations/123",
  "subject": {
    "id": "user-456",
    "roles": ["analyst", "viewer"],
    "attributes": {
      "department": "security"
    }
  },
  "context": {
    "clientIp": "10.0.0.1"
  }
}
```

**Response:**

```json
{
  "allowed": true,
  "reason": "Viewer role has read access",
  "matchedPolicy": "viewer-read",
  "evaluationTimeMs": 2
}
```

## Emergency Controls

### Kill-Switch

The kill-switch immediately halts all non-essential operations:

- Stops background job processing
- Rejects new graph mutations
- Maintains read-only access for critical dashboards

Use when:

- Critical security incident detected
- Database corruption suspected
- Runaway resource consumption

### Safe-Mode

Safe-mode reduces functionality while maintaining core services:

- Disables AI/ML features
- Limits concurrent operations
- Increases logging verbosity

Use when:

- Elevated error rates
- Dependency degradation
- Pre-maintenance preparation

## Monitoring Integration

The system health status is exposed as Prometheus metrics:

```promql
# Kill-switch state (1 = enabled)
summit_kill_switch_enabled

# Safe-mode state (1 = enabled)
summit_safe_mode_enabled

# Backpressure indicator
summit_backpressure_active

# Policy denial rate
rate(summit_policy_denials_total[5m])
```

## Runbook

### Enabling Kill-Switch

```bash
curl -X POST https://api.example.com/ops/system-health/kill-switch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "reason": "Emergency: high error rate"}'
```

### Checking Status

```bash
curl https://api.example.com/ops/system-health \
  -H "Authorization: Bearer $TOKEN"
```

### Disabling Kill-Switch

```bash
curl -X POST https://api.example.com/ops/system-health/kill-switch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```
