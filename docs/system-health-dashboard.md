# System Health & Invariants Dashboard

## Overview

The System Health & Invariants Dashboard provides operators and administrators with real-time visibility into Summit's safety posture, including:

- **Invariants Enforcement**: Status and recent violations
- **Kill Switch State**: Current operational mode (normal, soft, hard, catastrophic)
- **Policy Denials**: Authorization failures and top denied rules
- **Verification Gates**: Status of chaos, adversarial, and invariant tests

## Architecture

### Backend Endpoints

**Base Path**: `/api/ops/system-health`

All endpoints require:
- Authentication via JWT token
- Admin role authorization

#### GET `/api/ops/system-health/summary`

Returns comprehensive system health snapshot.

**Response**:
```json
{
  "generatedAt": "2024-01-10T12:00:00Z",
  "commitOrVersion": "abc123",
  "invariants": {
    "enforced": true,
    "lastViolationAt": "2024-01-10T11:00:00Z",
    "activePolicies": 12,
    "recentViolations24h": 2
  },
  "killSwitch": {
    "state": "normal",
    "lastTripAt": null,
    "reason": null
  },
  "policy": {
    "denials24h": 5,
    "topRules": [
      { "ruleId": "tenant-isolation", "count": 3 }
    ]
  },
  "verification": {
    "lastRunAt": "2024-01-10T10:00:00Z",
    "gates": [
      { "id": "chaos", "name": "Chaos Testing", "status": "pass" }
    ]
  }
}
```

#### GET `/api/ops/system-health/events`

Returns recent system health events with filtering.

**Query Parameters**:
- `since` (ISO date): Filter events after this timestamp
- `limit` (1-1000): Max events to return (default: 100)
- `type`: Event type filter
- `severity`: Severity filter (info, warn, error, critical)

**Response**:
```json
{
  "events": [
    {
      "id": "evt_123",
      "timestamp": "2024-01-10T11:30:00Z",
      "type": "policy_denial",
      "severity": "warn",
      "summary": "Access denied to /api/admin",
      "details": { "ruleId": "admin-only", "userId": "user-123" }
    }
  ],
  "total": 1,
  "filters": { "since": null, "limit": 100, "type": null, "severity": null }
}
```

#### POST `/api/ops/system-health/events`

Internal endpoint for emitting health events.

**Request**:
```json
{
  "type": "invariant_violation",
  "severity": "error",
  "summary": "Tenant boundary violation detected",
  "details": { "tenantId": "t-123", "resourceId": "r-456" }
}
```

**Valid Event Types**:
- `invariant_violation`
- `kill_switch_trip`
- `policy_denial`
- `verification_gate_failure`
- `safety_mode_change`

**Valid Severities**: `info`, `warn`, `error`, `critical`

### Frontend

**Route**: `/ops/system-health`

**Feature Flag**: `VITE_FEATURE_SYSTEM_HEALTH_DASHBOARD=true`

**Access**: Requires admin role

**Features**:
- Real-time health summary with 30-second auto-refresh
- Offline cache support with staleness indicator
- Tabbed interface (Overview / Events Timeline)
- Event filtering by type and severity
- Expandable event details
- Manual refresh capability

## Data Sources

### Event Emission Points

The system emits health events from:

1. **Invariant Violations**: `server/src/middleware/safety-mode.ts`
2. **Kill Switch Trips**: `server/src/middleware/kill-switch.ts`
3. **Policy Denials**: `server/src/middleware/opa-enforcer.ts`
4. **Verification Failures**: Test runners and verification scripts

### Event Store

- **Development/Test**: In-memory ring buffer (1000 events max)
- **Production**: File-backed JSONL store (recommended) or external event log

The current implementation uses an in-memory store. For production, integrate with:
- Existing audit log system
- Time-series database (InfluxDB, Prometheus)
- Centralized logging (ELK, Loki)

## How to Use

### Accessing the Dashboard

1. Ensure feature flag is enabled:
   ```bash
   export VITE_FEATURE_SYSTEM_HEALTH_DASHBOARD=true
   ```

2. Restart the client:
   ```bash
   cd client && npm run dev
   ```

3. Navigate to `/ops/system-health` (visible in navigation for admins only)

### Interpreting Status

**Overall Status**:
- **OK** (Green): All systems operational, no recent violations
- **Warning** (Yellow): Kill switch in soft mode OR recent violations
- **Critical** (Red): Kill switch in hard/catastrophic mode OR verification gates failing

**Kill Switch States**:
- **Normal**: All operations allowed
- **Soft**: High-risk endpoints disabled (e.g., `/api/webhooks`, `/api/ai`)
- **Hard**: All mutations blocked (global kill switch active)
- **Catastrophic**: Emergency mode, system requires immediate intervention

### Running Verification Gates

Execute verification scripts to test system invariants:

```bash
# Run all verification gates
npm run verify

# Specific verification types
npm run test:fuzz:graph-guardrails  # Invariant fuzzing
scripts/chaos/chaos-probe.sh        # Chaos testing
scripts/security/verify-tenant-isolation.ts  # Tenant isolation
```

## Adding New Health Gates

1. **Create Verification Script**:
   ```bash
   # Add to scripts/verify-my-invariant.ts
   export async function verifyMyInvariant(): Promise<{ status: 'pass' | 'fail', message: string }> {
     // Your verification logic
   }
   ```

2. **Emit Events on Failure**:
   ```typescript
   import { healthEventStore } from '../routes/ops-health.js';

   healthEventStore.addEvent({
     type: 'verification_gate_failure',
     severity: 'error',
     summary: 'My invariant verification failed',
     details: { gate: 'my-invariant', reason: 'test' }
   });
   ```

3. **Update Summary Endpoint**:
   Add gate to `/api/ops/system-health/summary` gate list:
   ```typescript
   gates: [
     // ... existing gates
     { id: 'my-invariant', name: 'My Invariant', status: 'pass' }
   ]
   ```

## Adding New Event Types

1. **Update Type Definition** in `server/src/routes/ops-health.ts`:
   ```typescript
   type: 'invariant_violation' | 'kill_switch_trip' | 'policy_denial' | 'verification_gate_failure' | 'my_new_type'
   ```

2. **Update Validation**:
   ```typescript
   const validTypes = [..., 'my_new_type'];
   ```

3. **Emit Events**:
   ```typescript
   healthEventStore.addEvent({
     type: 'my_new_type',
     severity: 'warn',
     summary: 'Description',
     details: { key: 'value' }
   });
   ```

4. **Update UI Filter** in `client/src/pages/SystemHealthDashboard.tsx`:
   ```tsx
   <MenuItem value="my_new_type">My New Type</MenuItem>
   ```

## Testing

### Backend Tests

```bash
cd server
npm test -- ops-health.test.ts
```

### Frontend Tests

```bash
cd client
npm test -- SystemHealthDashboard.test.tsx
```

### Integration Test

```bash
# Start server
cd server && npm run dev

# Start client with feature flag
cd client && VITE_FEATURE_SYSTEM_HEALTH_DASHBOARD=true npm run dev

# Navigate to http://localhost:3000/ops/system-health
```

## Troubleshooting

### Dashboard Shows "Offline - Showing Cached Data"

- Check server is running: `curl http://localhost:4000/api/ops/system-health/summary`
- Verify auth token is valid
- Check browser console for CORS errors

### Navigation Menu Missing "System Health"

- Verify feature flag: `VITE_FEATURE_SYSTEM_HEALTH_DASHBOARD=true`
- Ensure user has admin role
- Clear browser cache and restart client

### No Events Appearing

- Events are stored in-memory and cleared on server restart
- Emit test event: `POST http://localhost:4000/api/ops/system-health/events`
- Check server logs for event emission

### 403 Forbidden on API Calls

- Verify user has admin role
- Check Authorization header includes valid JWT token
- Review `server/src/middleware/rbac.ts` role requirements

## Production Considerations

1. **Persistent Event Storage**: Replace in-memory store with database
2. **Event Retention**: Implement TTL/archival for old events
3. **Rate Limiting**: Already protected by existing middleware
4. **Monitoring**: Add Prometheus metrics for dashboard usage
5. **Alerting**: Integrate critical events with PagerDuty/Opsgenie
6. **Audit**: All health events are logged via pino logger

## Related Files

- Backend: `server/src/routes/ops-health.ts`
- Frontend: `client/src/pages/SystemHealthDashboard.tsx`
- Safety State: `server/src/middleware/safety-mode.ts`
- Kill Switch: `server/src/middleware/kill-switch.ts`
- Feature Flags: `client/src/flags/featureFlags.ts`
