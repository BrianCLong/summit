# System Health Dashboard - Quick Start

## 🚀 5-Minute Setup

### 1. Enable the Feature
```bash
# Add to your .env file or export
export VITE_FEATURE_SYSTEM_HEALTH_DASHBOARD=true
```

### 2. Start Services
```bash
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

### 3. Access Dashboard
- Open: http://localhost:3000/ops/system-health
- Login with admin credentials
- Look for "System Health" in the navigation menu (with heart monitor icon)

## 📊 What You'll See

### Four Key Panels

1. **Invariants** 🛡️
   - ✅ Enforced/Not Enforced status
   - Recent violations count (24h)
   - Active policies count

2. **Kill Switch** 🔴
   - Normal/Soft/Hard/Catastrophic state
   - Last trip timestamp
   - Reason for activation

3. **Policy Denials** 🚫
   - Total denials in 24h
   - Top 5 denied rules
   - Rule violation counts

4. **Verification Gates** ✓
   - Chaos Testing status
   - Adversarial Tests status
   - Invariant Verification status
   - Tenant Isolation status

### Overall Status Badge
- **Green (OK)**: All systems operational
- **Yellow (Warning)**: Soft kill switch OR recent violations
- **Red (Critical)**: Hard kill switch OR failed verification gates

## 🧪 Testing It Out

### Emit a Test Event
```bash
curl -X POST http://localhost:4000/api/ops/system-health/events \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "policy_denial",
    "severity": "warn",
    "summary": "Test policy denial event",
    "details": {
      "ruleId": "test-rule",
      "userId": "test-user"
    }
  }'
```

### View Events
1. Switch to "Events Timeline" tab
2. See your test event appear
3. Click expand icon to see details
4. Use filters to narrow by type/severity

## 📖 Common Tasks

### Filter Events
```
Type: All Types / Invariant Violations / Policy Denials / etc.
Severity: All / Info / Warning / Error / Critical
```

### Refresh Data
- Click refresh icon (↻) in top-right
- Auto-refreshes every 30 seconds
- Works offline (shows cached data with warning)

### Check Specific Gate
Look at Verification Gates panel:
- **Pass** = Green
- **Fail** = Red
- **Warn** = Yellow
- **Unknown** = Gray

## 🔧 Running Verification

```bash
# All verification gates
npm run verify

# Specific tests
npm run test:fuzz:graph-guardrails     # Invariant fuzzing
scripts/chaos/chaos-probe.sh            # Chaos testing
scripts/security/verify-tenant-isolation.ts  # Tenant isolation
```

## ❓ Troubleshooting

### "System Health" not in menu?
- ✓ Feature flag enabled?
- ✓ Logged in as admin?
- ✓ Client restarted after setting flag?

### "Offline - Showing Cached Data"?
- ✓ Server running on port 4000?
- ✓ Check: `curl http://localhost:4000/api/ops/system-health/summary`
- ✓ CORS errors in browser console?

### No events showing?
- ✓ Events stored in-memory (cleared on restart)
- ✓ Emit test event (see above)
- ✓ Check Events Timeline tab

### 403 Forbidden?
- ✓ User has admin role?
- ✓ Valid JWT token in localStorage?
- ✓ Check server logs for auth errors

## 📚 Full Documentation

For complete details, see: `docs/system-health-dashboard.md`

## 🎯 Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ops/system-health/summary` | GET | Admin | Health snapshot |
| `/api/ops/system-health/events` | GET | Admin | Event stream |
| `/api/ops/system-health/events` | POST | Admin | Emit event |

| Event Type | Description |
|------------|-------------|
| `invariant_violation` | Safety invariant broken |
| `kill_switch_trip` | Kill switch activated |
| `policy_denial` | Authorization denied |
| `verification_gate_failure` | Test/verification failed |
| `safety_mode_change` | Safety mode toggled |

| Kill Switch State | Meaning |
|-------------------|---------|
| Normal | All operations allowed |
| Soft | High-risk endpoints blocked |
| Hard | All mutations blocked |
| Catastrophic | Emergency mode |

---

**Need help?** Check the full docs or server logs for detailed error messages.
