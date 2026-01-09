# Hotfix Post-Mortem: {TAG}

**Date:** {DATE}
**Author:** {AUTHOR}
**Hotfix Tag:** {TAG}
**Parent Release:** {PARENT_TAG}
**Ticket:** {TICKET_URL}

---

## Executive Summary

{Brief 2-3 sentence summary of the incident and fix}

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| {TIME} | Incident detected |
| {TIME} | Investigation started |
| {TIME} | Root cause identified |
| {TIME} | Hotfix development started |
| {TIME} | Hotfix deployed to staging |
| {TIME} | Hotfix approved for production |
| {TIME} | Hotfix released ({TAG}) |
| {TIME} | Incident resolved |

---

## Root Cause Analysis

### What Happened

{Detailed description of the incident}

### Why It Happened

{Root cause analysis - use 5 Whys or similar technique}

### What Was the Impact

- **Users Affected:** {number/percentage}
- **Duration:** {duration}
- **Severity:** P{0-3}
- **Data Impact:** {any data loss or corruption?}

---

## Resolution

### Fix Description

{What the hotfix changed}

### Files Modified

```
{list of files changed in the hotfix}
```

### Testing Performed

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual verification
- [ ] Staging validation
- [ ] Canary deployment

---

## Waivers Used (if any)

| Waiver ID | Type | Gates Waived | Justification |
|-----------|------|--------------|---------------|
| {ID} | {type} | {gates} | {justification} |

---

## Prevention Measures

### Immediate Actions (This Sprint)

- [ ] {action item 1}
- [ ] {action item 2}

### Medium-Term Improvements (This Quarter)

- [ ] {improvement 1}
- [ ] {improvement 2}

### Long-Term Systemic Changes

- [ ] {systemic change 1}

---

## Lessons Learned

### What Went Well

- {positive observation 1}
- {positive observation 2}

### What Could Be Improved

- {improvement area 1}
- {improvement area 2}

---

## Approvals

- [ ] Engineering Lead: {name}
- [ ] SRE Lead: {name}
- [ ] Security (if applicable): {name}

---

## Related Links

- Incident Ticket: {TICKET_URL}
- Hotfix PR: {PR_URL}
- Release: {RELEASE_URL}
- Monitoring Dashboard: {DASHBOARD_URL}
