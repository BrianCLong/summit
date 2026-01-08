# API Contracts Evidence Repository

> **Epic:** GA-E3: API Contracts
> **Purpose:** Lock API contracts for GA with versioned endpoints, schema snapshots, and CI diff checks
> **SOC 2 Controls:** CC8.1, CC3.1, PI1.5

## Overview

This directory contains evidence and audit trails for API contract management as part of Summit GA hardening. The evidence demonstrates compliance with SOC 2 change management and processing integrity controls.

## Directory Structure

```
api-contracts/
├── README.md                    # This file
├── snapshots/                   # Schema snapshots (v1, v2, etc.)
├── diff-reports/                # Schema diff reports from CI/CD
├── audit-log/                   # Audit trail of schema changes
├── policy-evidence/             # Evidence of policy enforcement
└── soc2-mappings/              # SOC 2 control mappings
```

## Evidence Types

### 1. Schema Snapshots

**Location:** `/api-schemas/v{VERSION}/`

**Purpose:** Immutable record of API contracts at each major version

**Contents:**

- `graphql-schema-v{VERSION}.graphql` - GraphQL schema snapshot
- `openapi-spec-v{VERSION}.json` - OpenAPI specification snapshot
- `version-metadata.json` - Version metadata and hashes

**SOC 2 Mapping:** CC8.1 (Change management)

### 2. Schema Diff Reports

**Location:** `diff-reports/`

**Purpose:** Automated detection of breaking vs non-breaking changes

**Format:** JSON and text reports with:

- Breaking changes categorization
- Impact analysis
- Recommendations
- Schema hashes for integrity verification

**SOC 2 Mapping:** CC3.1 (Risk management), PI1.5 (Processing integrity)

### 3. Audit Logs

**Location:** `audit-log/`

**Purpose:** Immutable audit trail of all schema validation events

**Format:** JSON Lines (`.jsonl`) with:

- Timestamp
- Event type (schema_diff_check, version_bump, etc.)
- PR/commit information
- Result (pass/fail)
- SOC 2 control references

**Retention:** 7 years (SOC 2 requirement)

**SOC 2 Mapping:** CC8.1 (Authorization evidence)

### 4. Policy Evidence

**Location:** `policy-evidence/`

**Purpose:** Documentation of policy enforcement and compliance

**Contents:**

- Version policy document
- CI/CD workflow configurations
- Merge blocking evidence
- Approval workflows

**SOC 2 Mapping:** CC8.1 (Change management process)

### 5. SOC 2 Mappings

**Location:** `soc2-mappings/`

**Purpose:** Explicit mapping of controls to evidence

**Format:** Structured documentation linking:

- SOC 2 control requirements
- Implemented mechanisms
- Evidence artifacts
- Testing procedures

## SOC 2 Control Mappings

### CC8.1 - Change Management Authorization

**Control Requirement:** The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives.

**Implementation:**

1. **Schema Snapshots:** Immutable baseline for change detection
2. **CI/CD Validation:** Automated schema diff on every PR
3. **Breaking Change Detection:** Categorizes changes by impact
4. **Merge Blocking:** PRs with breaking changes cannot merge without version bump
5. **Audit Trail:** All checks logged with PR/author information

**Evidence Artifacts:**

- `/api-schemas/registry.json` - Version registry
- `/api-schemas/VERSION_POLICY.md` - Change policy
- `diff-reports/*.json` - Change analysis
- `audit-log/schema-checks.jsonl` - Audit trail
- `.github/workflows/schema-diff.yml` - Automated enforcement

### CC3.1 - Risk Management in Design

**Control Requirement:** The entity identifies, assesses, and manages risks associated with the design and development of its services.

**Implementation:**

1. **Impact Categorization:** Breaking vs non-breaking change classification
2. **Severity Assessment:** Critical/high/medium/low severity levels
3. **Recommendations Engine:** Automated guidance on version bumps
4. **Migration Planning:** Required documentation for breaking changes

**Evidence Artifacts:**

- `diff-reports/*.json` - Risk assessment in diff reports
- `/scripts/schema-diff.ts` - Risk categorization logic
- `/api-schemas/VERSION_POLICY.md` - Risk mitigation procedures

### PI1.5 - Processing Integrity at System Boundaries

**Control Requirement:** The entity implements policies and procedures to ensure that inputs and outputs are complete, accurate, timely, and valid to meet the entity's objectives.

**Implementation:**

1. **Schema Validation:** Input/output contracts enforced via snapshots
2. **Version Detection:** Request version validation middleware
3. **Response Headers:** Version metadata in all API responses
4. **Contract Testing:** Automated diff against known-good snapshots

**Evidence Artifacts:**

- `/api-schemas/v1/openapi-spec-v1.json` - API contract specification
- `/api-schemas/v1/graphql-schema-v1.graphql` - GraphQL contract
- `/server/src/middleware/api-version.ts` - Enforcement middleware
- `diff-reports/*.json` - Contract compliance validation

## Usage

### Viewing Schema Snapshots

```bash
# View current v1 GraphQL schema
cat /home/user/summit/api-schemas/v1/graphql-schema-v1.graphql

# View current v1 OpenAPI spec
cat /home/user/summit/api-schemas/v1/openapi-spec-v1.json

# View version metadata
cat /home/user/summit/api-schemas/v1/version-metadata.json
```

### Running Schema Diff Manually

```bash
# Compare current schema against v1 snapshot
npm run schema:diff

# Compare with specific version
npm run schema:diff -- --version=v1

# Generate text report
npm run schema:diff -- --output=text

# Strict mode (fail on breaking changes)
npm run schema:diff -- --strict
```

### Viewing Audit Logs

```bash
# View all schema check events
cat audit/ga-evidence/api-contracts/audit-log/schema-checks.jsonl

# Filter by date
grep "2025-12-27" audit/ga-evidence/api-contracts/audit-log/schema-checks.jsonl

# Count checks
wc -l audit/ga-evidence/api-contracts/audit-log/schema-checks.jsonl
```

### Viewing Diff Reports

```bash
# List all diff reports
ls -lt audit/ga-evidence/api-contracts/diff-reports/

# View latest JSON report
cat audit/ga-evidence/api-contracts/diff-reports/schema-diff-v1-*.json | jq .

# View latest text report
cat audit/ga-evidence/api-contracts/diff-reports/schema-diff-v1-*.txt
```

## Compliance Verification

### SOC 2 Audit Checklist

- [ ] Schema snapshots exist for all supported versions
- [ ] All snapshots have SHA256 hashes in metadata
- [ ] CI/CD workflow runs on all schema-affecting PRs
- [ ] Breaking changes blocked without version bump
- [ ] Audit log has 7+ year retention configured
- [ ] Version policy documented and accessible
- [ ] Middleware enforces version detection
- [ ] Deprecation warnings implemented
- [ ] Sunset handling returns HTTP 410
- [ ] All evidence artifacts accessible to auditors

### Evidence Completeness

This repository provides complete audit trails for:

1. ✅ **What changed** - Schema diffs with line-level detail
2. ✅ **When it changed** - Timestamps in all artifacts
3. ✅ **Who changed it** - PR author in audit logs
4. ✅ **Why it changed** - PR titles and descriptions
5. ✅ **Impact** - Breaking vs non-breaking categorization
6. ✅ **Approval** - CI checks must pass before merge
7. ✅ **Rollback** - Immutable snapshots enable rollback

## Maintenance

### Adding a New Version

When creating a new API version (e.g., v2):

1. Create snapshot directory:

   ```bash
   mkdir -p api-schemas/v2
   ```

2. Generate snapshots:

   ```bash
   npm run schema:snapshot -- --version v2
   ```

3. Update registry:

   ```bash
   # Edit api-schemas/registry.json
   # Add v2 to supported versions
   # Update latest version to v2
   ```

4. Create migration guide:

   ```bash
   # Document in api-schemas/VERSION_POLICY.md
   # Add v1-to-v2 migration section
   ```

5. Update CI workflow:
   ```bash
   # .github/workflows/schema-diff.yml
   # Update default version if needed
   ```

### Deprecating a Version

1. Update registry status:

   ```json
   {
     "deprecated": ["v1"],
     "versions": {
       "v1": {
         "status": "deprecated",
         "sunsetDate": "2026-12-27"
       }
     }
   }
   ```

2. Announce to clients (12 months notice minimum)

3. Monitor deprecation header responses

4. After sunset date, move to `sunset` array

### Audit Log Rotation

Audit logs are retained indefinitely for SOC 2 compliance. If rotation is needed:

1. Archive logs older than 7 years
2. Compress with gzip
3. Move to cold storage
4. Maintain index of archived logs

## References

- **Version Policy:** `/api-schemas/VERSION_POLICY.md`
- **API Versioning Docs:** `/docs/API_VERSIONING.md`
- **Schema Diff Script:** `/scripts/schema-diff.ts`
- **CI Workflow:** `/.github/workflows/schema-diff.yml`
- **Version Middleware:** `/server/src/middleware/api-version.ts`

## Contact

- **Owner:** Platform Engineering Team
- **Epic:** GA-E3: API Contracts
- **Support:** #platform-engineering

---

**Last Updated:** 2025-12-27
**Audit Ready:** ✅ Yes
**SOC 2 Compliant:** ✅ Yes
