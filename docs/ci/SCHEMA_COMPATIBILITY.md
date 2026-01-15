# Schema Compatibility Check

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Schema Compatibility Check verifies that GraphQL schema changes are backward compatible during RC stabilization. It prevents breaking changes that could affect API consumers.

### Key Properties

- **Breaking change detection**: Identifies removed types, fields, queries, mutations
- **Additive change tracking**: Reports new additions to the schema
- **Baseline comparison**: Compares against RC tag baseline
- **PR integration**: Comments on PRs with breaking changes

---

## What Constitutes a Breaking Change

### Breaking (Not Allowed During Stabilization)

| Change Type      | Example                           | Impact                     |
| ---------------- | --------------------------------- | -------------------------- |
| Removed type     | `type User` deleted               | Clients querying User fail |
| Removed field    | `User.email` removed              | Queries for email fail     |
| Removed query    | `query getUser` deleted           | Client queries fail        |
| Removed mutation | `mutation createUser` deleted     | Client mutations fail      |
| Changed type     | `id: ID!` to `id: Int!`           | Type mismatch errors       |
| Made required    | `name: String` to `name: String!` | Null inputs rejected       |

### Additive (May Be Allowed)

| Change Type   | Example                           | Impact                        |
| ------------- | --------------------------------- | ----------------------------- |
| New type      | `type NewFeature` added           | No impact on existing clients |
| New field     | `User.avatar` added               | No impact on existing queries |
| New query     | `query searchUsers` added         | No impact on existing clients |
| New mutation  | `mutation updateAvatar` added     | No impact on existing clients |
| Made optional | `name: String!` to `name: String` | More permissive               |

---

## Workflow Triggers

| Trigger  | Condition           | Action                   |
| -------- | ------------------- | ------------------------ |
| PR       | Schema file changes | Verify against latest RC |
| Tag Push | `v*.*.*-rc.*`       | Baseline verification    |
| Manual   | Workflow dispatch   | Custom baseline check    |

---

## Configuration Options

| Option              | Description                | Default                  |
| ------------------- | -------------------------- | ------------------------ |
| `--baseline`        | Git ref to compare against | Latest RC tag            |
| `--schema`          | Path to schema file        | `graphql/schema.graphql` |
| `--strict`          | Fail on any schema change  | `false`                  |
| `--allow-additions` | Allow additive changes     | `false`                  |
| `--report`          | Generate detailed report   | `false`                  |

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions -> Schema Compatibility Check
2. Click "Run workflow"
3. Configure options:
   - `baseline`: Specific ref to compare against
   - `schema`: Path to schema file
   - `strict`: Fail on any change
   - `allow_additions`: Permit additive changes
4. Click "Run workflow"

### Via CLI

```bash
# Check against latest RC tag
./scripts/release/check_schema_compatibility.sh

# Check against specific baseline
./scripts/release/check_schema_compatibility.sh --baseline v4.1.2-rc.1

# Check specific schema file
./scripts/release/check_schema_compatibility.sh --schema server/schema.graphql

# Strict mode (fail on any change)
./scripts/release/check_schema_compatibility.sh --strict

# Allow additive changes
./scripts/release/check_schema_compatibility.sh --allow-additions

# Generate report
./scripts/release/check_schema_compatibility.sh --report
```

---

## Status Codes

| Status | Meaning                         | Exit Code |
| ------ | ------------------------------- | --------- |
| PASS   | No breaking changes, compatible | 0         |
| WARN   | Additive changes only           | 0         |
| FAIL   | Breaking changes detected       | 1         |
| SKIP   | Not in RC stabilization phase   | 0         |

---

## PR Integration

When a PR modifies the schema during RC stabilization with breaking changes:

1. Schema compatibility check runs automatically
2. Detects breaking changes against RC baseline
3. Posts detailed comment on the PR
4. Fails the check (blocking merge)

### Sample PR Comment

```markdown
## ❌ Schema Compatibility Check Failed

This PR introduces **breaking changes** to the GraphQL schema during RC stabilization.

**Baseline:** `v4.1.2-rc.1`
**Breaking Changes:** 3

### Breaking changes are not allowed during RC stabilization

Options:

1. **Revert the breaking changes** if they're not critical
2. **Get release team approval** if changes are necessary
3. **Cut a new RC** if breaking changes must go in
```

---

## Report Output

Generated reports include:

```markdown
# Schema Compatibility Report

**Generated:** 2026-01-08T10:00:00Z
**Baseline:** v4.1.2-rc.1
**Schema:** graphql/schema.graphql
**Status:** FAIL

---

## Summary

| Category         | Count |
| ---------------- | ----- |
| Breaking Changes | 2     |
| Additions        | 3     |

---

## Breaking Changes

- ❌ Removed type: LegacyUser
- ❌ Removed query: getLegacyData

---

## Additions

- ➕ Added type: NewFeature
- ➕ Added query: getNewData
- ➕ Added field: User.preferences
```

---

## State Tracking

State in `docs/releases/_state/schema_compatibility_state.json`:

```json
{
  "version": "1.0.0",
  "last_check": "2026-01-08T10:00:00Z",
  "last_result": {
    "baseline": "v4.1.2-rc.1",
    "schema": "graphql/schema.graphql",
    "status": "PASS",
    "breaking_changes": 0,
    "additions": 2
  },
  "checks": [...]
}
```

---

## Handling Breaking Changes

### When Breaking Changes Are Necessary

1. **Document thoroughly**: Explain why the change is needed
2. **Get approval**: Release team must approve
3. **Update version**: Consider cutting a new RC
4. **Notify consumers**: Alert API consumers of the change
5. **Update clients**: Ensure all internal clients are updated

### Migration Strategy

```graphql
# Instead of removing a field directly:
type User {
  email: String # Remove this
}

# Add deprecation first:
type User {
  email: String @deprecated(reason: "Use emailAddress instead")
  emailAddress: String
}

# Remove in a future major version
```

---

## Integration with Other Checks

The schema compatibility check integrates with:

- **RC Lockdown**: Complements basic schema change detection
- **Dependency Freeze**: Part of overall stabilization checks
- **Pre-Release Health**: Affects health score
- **Stabilization Report**: Included in progress metrics

---

## Best Practices

1. **Design for compatibility**: Always add, never remove during stabilization
2. **Use deprecation**: Mark fields as deprecated before removal
3. **Version your API**: Use versioned schemas for major changes
4. **Test clients**: Verify client compatibility before schema changes
5. **Document changes**: Keep a schema changelog

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Dependency Freeze](DEPENDENCY_FREEZE.md)
- [RC Lockdown Workflow](.github/workflows/rc-lockdown.yml)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

---

## Change Log

| Date       | Change                       | Author               |
| ---------- | ---------------------------- | -------------------- |
| 2026-01-08 | Initial Schema Compatibility | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
