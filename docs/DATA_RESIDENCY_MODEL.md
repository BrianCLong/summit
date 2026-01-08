# Data Residency & Sovereignty Model

**Version:** 1.0.0
**Status:** Authoritative

## 1. Overview

Summit enforces strict data residency controls to ensure that data is stored, processed, and accessed only within authorized geographic and jurisdictional boundaries. This model defines the taxonomy, policy schema, and enforcement mechanisms.

## 2. Taxonomy

### 2.1 Regions

Physical locations where data persists or computation occurs.

- `US` (United States)
- `EU` (European Union)
- `APAC` (Asia Pacific)
- `CANADA` (Canada)
- `JAPAN` (Japan)

### 2.2 Jurisdictions

Legal frameworks governing the data.

- `US-FED` (US Federal)
- `GDPR` (General Data Protection Regulation)
- `CCPA` (California Consumer Privacy Act)
- `APPI` (Act on the Protection of Personal Information - Japan)

### 2.3 Data Classifications

- `PUBLIC`: No residency restrictions.
- `INTERNAL`: Company internal data, residency defaults apply.
- `CONFIDENTIAL`: PII/Sensitive, strict residency enforcement.
- `RESTRICTED`: Critical IP/Legal, strict residency + no transfer exceptions.
- `TOP-SECRET`: National security/Highest sensitivity, specific isolated regions only.

### 2.4 Processing Scopes

- `STORAGE`: Data at rest (Databases, Object Storage).
- `COMPUTE`: Data in transit/processing (Agents, API handling).
- `LOGS`: Telemetry and audit logs.
- `BACKUPS`: Long-term archival.

## 3. Residency Policy Schema

A residency policy is a JSON object bound to a Tenant.

```json
{
  "tenantId": "string",
  "policyVersion": "1.0",
  "primaryRegion": "string (Region)",
  "allowedRegions": ["string (Region)"],
  "prohibitedRegions": ["string (Region)"],
  "dataClassifications": {
    "CONFIDENTIAL": {
      "storage": ["allowedRegions"],
      "compute": ["allowedRegions"],
      "logs": ["primaryRegion"],
      "backups": ["primaryRegion"]
    }
  },
  "exceptions": [
    {
      "id": "string",
      "targetRegion": "string",
      "scope": "COMPUTE",
      "justification": "string",
      "expiresAt": "ISO8601",
      "approvedBy": "string"
    }
  ]
}
```

## 4. Enforcement Strategy

### 4.1 Storage & Retrieval

- Database connections must verify tenant residency before query execution.
- Cross-region replication is disabled by default for `CONFIDENTIAL+` data unless explicitly allowed.

### 4.2 Agent Execution

- Agents must be scheduled on workers within the tenant's allowed compute regions.
- Agents attempting to fetch contexts from prohibited regions will fail.

### 4.3 Exceptions

- Exceptions are time-bound and require audit logging.
- Expired exceptions strictly block access (Fail Closed).

## 5. Verification

- **CI Checks:** Verify policy schema validity.
- **Runtime Checks:** Middleware validates `Residency-Context`.
- **Audit:** All cross-region attempts (allowed or blocked) are logged.
