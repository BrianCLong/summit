# Summit CI/CD Integration Guide

This document explains how the Project 19 governance fields integrate with existing Summit CI/CD artifacts and processes.

## Overview

The Summit governance system integrates with CI/CD by consuming artifact-based evidence and automatically updating corresponding GitHub Project fields. This follows the "evidence-pointer" pattern where:

- **CI artifacts store the full evidence** (detailed test results, security scans, compliance reports)
- **Project items store pointers and summaries only** (Yes/No, buckets, scores, identifiers)

This preserves a single source of truth while enabling executive visibility.

## Mapping: CI Artifacts → Project Fields

### Core Artifacts & Fields

| Artifact                  | Project Fields Updated                                                                      | Extraction Method                |
| ------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| `stamp.json`              | CI Status Snapshot, Policy Version, Evidence Bundle ID, Evidence Complete, Determinism Risk | Direct mapping of known fields   |
| `report.json`             | Gate Status, Evidence Complete, Determinism Risk, Violations Count                          | Status and compliance validation |
| `coverage-summary.json`   | Test Coverage Delta, Current/Baseline Coverage                                              | Coverage metrics extraction      |
| `security-results.json`   | Audit Criticality, External Audit Scope, Vulnerability Counts                               | Security scan results            |
| `compliance-results.json` | Evidence Required, Control Mapping, Framework Coverage                                      | Compliance validation output     |

### CI Health Signals

- **`CI Status Snapshot`**: Mapped from `workflow_run.conclusion` (Green/Failing/Flaky/Unknown)
- **`Determinism Risk`**: From `stamp.determinism_risk` or `report.determinism_risk`
- **`Artifact Produced`**: Based on successful artifact download
- **`Policy Version`**: From `stamp.policy_version`
- **`Test Coverage Delta`**: From `coverage-summary.delta_percent`

### Evidence Signals

- **`Evidence Bundle ID`**: From `stamp.evidence_bundle_id`
- **`Evidence Complete`**: From `stamp.evidence_complete` or `report.evidence_complete`
- **`Evidence Required`**: From `compliance-results.evidence_required`

### Compliance & Audit Signals

- **`Audit Criticality`**: From `security-results.audit_criticality`
- **`External Audit Scope`**: From `security-results.external_audit_scope`
- **`Control Mapping`**: From `compliance-results.frameworks`

## Implementation Pattern

### 1. Artifact Processing Pipeline

```
Workflow Run Completion Event
    ↓ (GitHub Actions Event)
Download Artifacts (with retry/expiration handling)
    ↓ (Artifact Processing)
Parse Content & Extract Signals
    ↓ (Field Mapping)
Update Project Fields (with validation)
    ↓ (Enforcement Check)
Validate Against Schema & Constraints
```

### 2. Safety & Validation Layers

All CI → Project integrations follow these safety patterns:

1. **Validation First**: All artifacts validated against expected schema before field updates
2. **Dry-Run Default**: Field updates default to simulation mode
3. **Bounded Changes**: Max number of fields updated per run (safety valve)
4. **Deterministic Processing**: Stable ordering and reproducible results
5. **Error Isolation**: Failures in one artifact don't block others

### 3. Field Update Constraints

- **Computed fields** (WSJF Score, True Priority, etc.) are never updated from CI
- **Field type validation** ensures CI artifacts provide expected value types
- **Cross-field constraints** validated before applying updates

## Event-Driven vs Scheduled Integration

### Event-Driven (Immediate Updates)

- Runs when `workflow_run.completed` events occur
- Updates fields immediately based on artifacts from that specific run
- Good for CI health, immediate status updates
- Safety: Limited to workflow-specific fields only

### Scheduled Reconciliation (Batch Updates)

- Runs nightly (or as configured)
- Processes accumulated artifacts from all relevant workflow runs
- Updates computed fields and performs cross-artifact analysis
- Safety: Full validation pass with comprehensive error reporting

## Security and Access

### Required Permissions

- **`GITHUB_TOKEN`**: Needs `actions:read` to download workflow artifacts
- **Project Access**: Needs write access to update Project fields
- **Content Access**: Needs read access to link artifacts to specific issues/PRs

### Artifact Retention

- Ensure workflow artifacts are retained long enough for governance processing
- Recommended: 90-day retention for audit purposes
- Governance system should gracefully degrade if artifacts expire

## Error Handling & Recovery

### Common Integration Issues

1. **Expired Artifacts**: Artifact expired before processing
2. **Schema Mismatch**: CI artifact doesn't match expected structure
3. **Field Not Found**: Project field referenced in mapping doesn't exist
4. **Rate Limits**: Too many API calls during artifact processing
5. **Permissions**: Insufficient permissions to update Project fields

### Recovery Procedures

1. **Immediate Response**: Log errors to governance artifacts for inspection
2. **Fallback Processing**: Use defaults if specific artifact fields missing
3. **Retry Logic**: Exponential backoff for rate limited operations
4. **Manual Override**: Document when human intervention required

## Integration Validation

### Verification Steps

1. Run integration in dry-run mode first
2. Confirm artifact mapping matches expected field values
3. Verify safety limits (MAX_FIX_SCOPE) are respected
4. Check that computed fields aren't inadvertently affected

### Monitoring

- Artifact processing success/failure rates
- Field update volumes (ensure within bounds)
- Governance drift detection (CI vs. Project field consistency)

## Advanced Pattern: Cross-Workflow Correlation

For complex scenarios, the system supports correlating artifacts across multiple workflows:

- Link results from `Security Scan` workflow with `GA Verify` workflow results
- Correlate `Evidence ID Check` with `Compliance Check` for unified gate status
- Aggregate results across multiple test suites for comprehensive readiness view

This requires stable IDs across workflows or consistent content-based correlation (e.g., issue numbers, PR numbers) to link related artifacts.

## Troubleshooting

### Debugging CI → Project Integration

1. **Check artifact availability**: Verify expected artifacts exist in workflow run
2. **Validate schema**: Confirm artifact content matches expected structure
3. **Verify field existence**: Confirm target fields exist in Project
4. **Review mapping configuration**: Check `project19-workflow-map.json` settings

### Performance Optimization

- Process artifacts in batches to reduce API calls
- Cache field ID mappings to reduce GraphQL queries
- Use efficient correlation methods to avoid O(n²) operations

This integration provides a robust, evidence-backed governance system that scales with the development process while maintaining executive visibility and audit readiness.
