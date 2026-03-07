# Release Readiness & Evidence Explorer

## Overview

The **Release Readiness & Evidence Explorer** is an in-app dashboard that provides real-time visibility into the releasability status of Summit builds. It answers the critical question: **"Is this build releasable?"** and **"Where is the evidence?"** in one click.

This feature makes GA (General Availability) verification auditable and operator-friendly by surfacing governance artifacts, compliance controls, and evidence mappings directly within the product interface.

## Purpose

- **Operator-Friendly GA Verification**: Consolidates all release readiness checks in a single dashboard
- **Evidence Traceability**: Links controls to concrete evidence artifacts (files, scripts, configuration)
- **Offline Resilience**: Supports offline/cached operation with explicit staleness indicators
- **Audit-Ready**: Provides verification commands for each evidence item
- **Role-Based Access**: Restricted to ADMIN and OPERATOR roles only

## Architecture

### Server API

Two authorized endpoints provide release readiness data:

#### `GET /api/ops/release-readiness/summary`

Returns a summary of readiness checks with overall status.

**Response Structure:**

```json
{
  "generatedAt": "2024-01-15T10:30:00Z",
  "versionOrCommit": "abc123",
  "checks": [
    {
      "id": "file-docs-governance-CONSTITUTION-md",
      "name": "Constitutional Governance",
      "status": "pass",
      "lastRunAt": "2024-01-15T10:30:00Z",
      "evidenceLinks": ["docs/governance/CONSTITUTION.md"]
    }
  ]
}
```

**Check Status Values:**

- `pass`: Check succeeded
- `fail`: Check failed (blocks release)
- `warn`: Check has warnings (review recommended)
- `unknown`: Check status could not be determined

#### `GET /api/ops/release-readiness/evidence-index`

Returns structured control and evidence mappings derived from governance artifacts.

**Response Structure:**

```json
{
  "controls": [
    {
      "id": "GOV-01",
      "name": "Code of Conduct & Ethics",
      "description": "Defines ethical standards...",
      "enforcementPoint": "Policy (Repository Root)",
      "evidenceArtifact": "CODE_OF_CONDUCT.md"
    }
  ],
  "evidence": [
    {
      "controlId": "GOV-01",
      "controlName": "Code of Conduct",
      "evidenceType": "Document",
      "location": "CODE_OF_CONDUCT.md",
      "verificationCommand": "ls -l CODE_OF_CONDUCT.md"
    }
  ]
}
```

**Data Sources:**

- `docs/compliance/CONTROL_REGISTRY.md` - Control definitions
- `docs/compliance/EVIDENCE_INDEX.md` - Evidence mappings
- File system checks for critical governance files

**Caching:**

- Server responses cached for 5 minutes
- Deterministic parsing (no external API calls)
- Safe for high-frequency requests

### Client UI

**Route:** `/ops/release-readiness`

**Feature Flag:** `release-readiness-dashboard` (boolean, default: `true`)

**Authorization:** Requires ADMIN or OPERATOR role

**UI Components:**

1. **Summary Card**
   - Overall status badge (Pass/Warn/Fail)
   - Version/commit information
   - Generation timestamp
   - Total check count

2. **Checks Tab**
   - Accordion list of all readiness checks
   - Status indicator for each check
   - Evidence links
   - Last run timestamp

3. **Evidence Explorer Tab**
   - **Controls Table**: All compliance controls with descriptions and enforcement points
   - **Evidence Items**: Detailed evidence with:
     - Control ID mapping
     - Evidence type and location
     - Verification command with copy button

**Offline Support:**

- Automatically caches summary and evidence data to `localStorage`
- Cache expiry: 5 minutes
- Stale data indicator with timestamp
- Offline mode indicator when fetch fails
- Graceful degradation: shows last-known-good data

**Accessibility:**

- All interactive elements have `aria-label` attributes
- Status icons have semantic color meanings
- Loading states clearly communicated
- Error states actionable (Retry button)

## How to Use

### Viewing Release Readiness

1. Navigate to **Release Readiness** in the main navigation (visible to ADMIN/OPERATOR only)
2. View the **Overall Status** card to see if the build is releasable
3. Expand individual checks to see evidence links and timestamps
4. Switch to **Evidence Explorer** tab to view detailed control mappings

### Verifying Evidence

1. In the **Evidence Explorer** tab, locate the control you want to verify
2. Find the associated evidence item
3. Click the **Copy** icon next to the verification command
4. Run the command in your terminal to verify the evidence exists

Example:

```bash
# Copy command from UI
ls -l docs/governance/CONSTITUTION.md

# Verify output shows file exists
-rw-r--r-- 1 user user 4521 Jan 15 10:00 docs/governance/CONSTITUTION.md
```

### Refreshing Data

- Click the **Refresh** icon in the top-right to fetch latest data
- Data auto-refreshes on page load
- Stale indicator shows if cached data is > 5 minutes old

## How Readiness Data is Produced

The release readiness service:

1. **Parses Governance Artifacts** (markdown tables):
   - `docs/compliance/CONTROL_REGISTRY.md` → Control definitions
   - `docs/compliance/EVIDENCE_INDEX.md` → Evidence mappings

2. **Runs File Existence Checks**:
   - `docs/governance/CONSTITUTION.md`
   - `docs/compliance/CONTROL_REGISTRY.md`
   - `docs/compliance/EVIDENCE_INDEX.md`
   - `SECURITY.md`
   - `CODE_OF_CONDUCT.md`

3. **Aggregates Status**:
   - `pass`: All critical files exist
   - `fail`: One or more critical files missing
   - `warn`: Files exist but are stale (future enhancement)

4. **Caches Results**:
   - In-memory cache (server-side, 5 min TTL)
   - LocalStorage cache (client-side, 5 min TTL)

## Adding a New Check/Control/Evidence

### To Add a New Readiness Check:

Extend `releaseReadinessService.checkGovernanceFiles()` in `server/src/services/releaseReadinessService.ts`:

```typescript
const requiredFiles = [
  // ... existing files
  { path: "docs/new-artifact.md", name: "New Artifact" },
];
```

### To Add a New Control:

Edit `docs/compliance/CONTROL_REGISTRY.md`:

```markdown
| **NEW-01** | New Control | Description | Enforcement Point | Evidence Artifact |
```

The service automatically parses and serves this via the API.

### To Add New Evidence:

Edit `docs/compliance/EVIDENCE_INDEX.md`:

```markdown
| **NEW-01** | New Control | Document | docs/new.md | `cat docs/new.md` |
```

The Evidence Explorer will automatically display it.

## Integration with CI/CD

While this dashboard surfaces readiness status in-app, the source data (governance artifacts) should be validated in CI:

1. **Pre-Merge Checks**:
   - Run `scripts/compliance/verify_governance.ts`
   - Run `scripts/compliance/check-controls.ts`
   - Ensure all critical files exist and are valid

2. **Pre-Release Gates**:
   - Run `scripts/ops/readiness-check.sh` (K8s operational readiness)
   - Run `scripts/security/verify-ga-security.ts`
   - Verify no drift in `scripts/compliance/verify_compliance_drift.ts`

3. **Post-Deploy Verification**:
   - Access `/ops/release-readiness` in deployed environment
   - Verify all checks show `pass`
   - Archive evidence for audit trail

## Troubleshooting

### "Failed to load data and no cached data available"

**Cause:** API endpoints are unreachable and no cached data exists.

**Resolution:**

1. Check server is running
2. Verify authentication token is valid (`localStorage.getItem('token')`)
3. Ensure user has ADMIN or OPERATOR role
4. Check network connectivity

### "Showing cached data - unable to connect to server"

**Cause:** API endpoints are unreachable but cached data is available.

**Resolution:**

- This is expected behavior during offline/network issues
- Data is stale but usable
- Click **Refresh** when connectivity is restored

### Checks Show "unknown" Status

**Cause:** Check logic failed or file access denied.

**Resolution:**

1. Check server logs for errors
2. Verify governance files exist in repo
3. Ensure file permissions allow reads

### Evidence Not Appearing

**Cause:** Parsing failed or markdown format incorrect.

**Resolution:**

1. Verify `CONTROL_REGISTRY.md` and `EVIDENCE_INDEX.md` use correct table format
2. Check for markdown table syntax errors (missing pipes, etc.)
3. Review server logs for parsing errors

## Feature Flag

The dashboard is controlled by the `release-readiness-dashboard` feature flag:

**Default:** `true` (enabled)

**To Disable:**

```bash
# Environment variable (non-production only)
export FEATURE_FLAGS="release-readiness-dashboard:false"
```

**To Enable for Specific Users:**
Edit `server/src/lib/featureFlags.ts` to use percentage or variant rollout.

## Security Considerations

- **Authorization Required**: All endpoints enforce ADMIN/OPERATOR role checks
- **Read-Only**: Dashboard only reads governance artifacts, never writes
- **No Secrets**: No sensitive data (API keys, credentials) displayed
- **Audit Trail**: Access to endpoints logged via audit middleware

## Related Documentation

- [Control Registry](../compliance/CONTROL_REGISTRY.md) - Control definitions
- [Evidence Index](../compliance/EVIDENCE_INDEX.md) - Evidence mappings
- [Governance Rules](../governance/GOVERNANCE_RULES.md) - Release governance
- [Evidence Verifier](./EVIDENCE_VERIFIER.md) - CLI verification tool
- [Incident Response](./INCIDENT_RESPONSE.md) - Handling failed checks

## Future Enhancements

- **Automated Verification**: Run verification commands and display results
- **Historical Trends**: Track readiness over time (pass rate, drift)
- **Evidence Pack Export**: Download evidence bundle as ZIP
- **Notification Integration**: Alert on readiness status changes
- **Scheduled Checks**: Periodic readiness verification with alerting
