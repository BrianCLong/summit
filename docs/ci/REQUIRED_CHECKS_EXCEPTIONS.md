# Required Checks Exceptions

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

Required Checks Exceptions provide an auditable mechanism for intentional deviations between policy (`REQUIRED_CHECKS_POLICY.yml`) and GitHub branch protection. Instead of creating permanent noise in drift detection, exceptions document approved mismatches with mandatory expiration dates.

### The Problem

Without exception management:

- Drift detection alerts on intentional mismatches
- Teams ignore drift alerts due to false positives
- No audit trail for why mismatches exist
- Permanent exceptions accumulate silently

### The Solution

A structured exception file that:

1. Documents each intentional deviation
2. Requires owner and approval ticket
3. Enforces mandatory expiration (max 90 days)
4. Integrates with drift detection and reconciliation
5. Provides validation on every change

---

## Exception Schema

Each exception has the following fields:

| Field        | Required | Description                                          |
| ------------ | -------- | ---------------------------------------------------- |
| `id`         | Yes      | Unique identifier (EXC-NNN format)                   |
| `check_name` | Yes      | Exact GitHub status check context name               |
| `direction`  | Yes      | `allow_missing_in_github` or `allow_extra_in_github` |
| `branch`     | Yes      | Branch name, or `*` for all branches                 |
| `reason`     | Yes      | Clear justification for this exception               |
| `owner`      | Yes      | GitHub username or team responsible                  |
| `created_at` | Yes      | Date created (YYYY-MM-DD)                            |
| `expires_at` | Yes      | Expiration date (YYYY-MM-DD, max 90 days)            |
| `ticket`     | Yes      | Link to approval ticket, issue, or PR                |

---

## Exception Directions

### allow_missing_in_github

Use when a check is in policy but intentionally NOT enforced in GitHub.

**Use Cases:**

- Check is being phased in gradually
- Check is temporarily disabled for migration
- Check applies to subset of branches only

**Effect:**

- Drift detection: Not reported as missing
- Reconciler: Not suggested for addition

### allow_extra_in_github

Use when a check is in GitHub but intentionally NOT in policy.

**Use Cases:**

- Legacy check being phased out
- Check is GitHub-specific (not policy-level)
- Temporary enforcement during incident

**Effect:**

- Drift detection: Not reported as extra
- Reconciler: Not suggested for removal

---

## Creating an Exception

### Step 1: Determine the Need

Before creating an exception, consider:

- Is this truly temporary? (Max 90 days)
- Is there an approval process completed?
- Can this be solved by updating policy instead?

### Step 2: Open an Issue/PR for Approval

Create a GitHub issue or PR documenting:

- Which check needs an exception
- Why the exception is needed
- Expected duration
- Who is responsible for resolution

### Step 3: Add the Exception

Edit `docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml`:

```yaml
exceptions:
  - id: "EXC-001"
    check_name: "Legacy Lint Check"
    direction: "allow_extra_in_github"
    branch: "main"
    reason: "Legacy check being phased out during Q1 migration"
    owner: "platform-team"
    created_at: "2026-01-08"
    expires_at: "2026-04-08"
    ticket: "https://github.com/org/repo/issues/12345"
```

### Step 4: Create PR

The validation workflow will automatically:

- Validate YAML syntax
- Check required fields
- Verify expiration date is within 90 days
- Warn about expiring soon exceptions

---

## Exception Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Create    │────▶│   Active    │────▶│   Expired   │────▶│  Archived   │
│  Exception  │     │ (filtering) │     │  (warning)  │     │   (audit)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │                   │                   │
      ▼                   ▼                   ▼
   Validate          Respects in           Warning in
   on PR             drift + reconcile     validation
```

### Active Exceptions

- Applied to drift detection filtering
- Applied to reconciler filtering
- Visible in reports as "excepted"

### Expired Exceptions

- NOT applied to filtering
- Logged as warnings during validation
- Should be moved to `archived_exceptions`

### Archived Exceptions

- Kept for audit trail
- Include `archived_at` and `archive_reason`
- No functional effect

---

## Validation

### Automatic Validation

The `required-checks-exceptions.yml` workflow runs on:

- Pull requests modifying exceptions file
- Push to main modifying exceptions file
- Manual trigger

### Validation Rules

1. **YAML Syntax** - File must be valid YAML
2. **Required Fields** - All mandatory fields present
3. **Unique IDs** - No duplicate exception IDs
4. **Valid Direction** - Must be valid enum value
5. **Date Format** - YYYY-MM-DD format required
6. **Max Duration** - Expiration ≤ 90 days from creation
7. **Ticket URL** - Should be a valid URL

### Running Locally

```bash
./scripts/release/validate_required_checks_exceptions.sh --verbose

# Strict mode (treat warnings as errors)
./scripts/release/validate_required_checks_exceptions.sh --strict

# Custom file
./scripts/release/validate_required_checks_exceptions.sh --file path/to/exceptions.yml
```

---

## Integration Points

### Drift Detection

The `check_branch_protection_drift.sh` script:

1. Loads active exceptions for the target branch
2. Filters out excepted mismatches
3. Reports only un-excepted drift
4. Includes excepted items in report for visibility

### Reconciler

The `reconcile_branch_protection.sh` script:

1. Loads active exceptions
2. Excludes excepted checks from action lists
3. Builds target state accounting for exceptions
4. Documents what was skipped due to exceptions

---

## Best Practices

### Use Meaningful IDs

Good: `EXC-001`, `EXC-002`, etc.
Bad: Random strings, duplicates

### Write Clear Reasons

Good: "Check temporarily disabled during Q1 auth migration - see RFC-123"
Bad: "Needed for now"

### Keep Exceptions Short

- Default to 30 days
- Maximum of 90 days
- If you need longer, create a follow-up exception

### Archive Rather Than Delete

Move expired exceptions to `archived_exceptions`:

```yaml
archived_exceptions:
  - id: "EXC-000"
    check_name: "Deprecated Check"
    direction: "allow_missing_in_github"
    branch: "main"
    reason: "Check temporarily disabled during migration"
    owner: "devops-team"
    created_at: "2025-10-01"
    expires_at: "2025-12-31"
    ticket: "https://github.com/org/repo/issues/11111"
    archived_at: "2026-01-02"
    archive_reason: "Migration complete, check re-enabled"
```

### Link to Tickets

Always include a link to:

- Issue discussing the exception
- PR implementing the change
- RFC or decision document

---

## Monitoring

### Expiration Warnings

The validation workflow warns about:

- Exceptions expiring within 7 days
- Already expired exceptions

### Drift Reports

Drift reports now include:

- `excepted_missing_count` - Missing checks covered by exceptions
- `excepted_extra_count` - Extra checks covered by exceptions
- List of excepted mismatches

---

## Troubleshooting

### "yq not available"

Exception loading requires yq for YAML parsing.

**Install:**

```bash
# macOS
brew install yq

# Linux
sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
sudo chmod +x /usr/local/bin/yq
```

### "Expiration exceeds max duration"

Exceptions cannot exceed 90 days.

**Solutions:**

- Use a shorter duration
- If truly needed longer, create a follow-up exception closer to expiration
- Consider updating policy instead

### "Duplicate ID"

Exception IDs must be unique.

**Solution:** Use next available EXC-NNN number.

### "Missing ticket field"

Every exception must link to an approval.

**Solution:** Create an issue or use the PR number where exception was added.

---

## References

- **Exceptions File:** `docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml`
- **Validation Script:** `scripts/release/validate_required_checks_exceptions.sh`
- **Validation Workflow:** `.github/workflows/required-checks-exceptions.yml`
- **Drift Detection:** `docs/ci/BRANCH_PROTECTION_DRIFT.md`
- **Reconciliation:** `docs/ci/BRANCH_PROTECTION_RECONCILIATION.md`
- **Policy File:** `docs/ci/REQUIRED_CHECKS_POLICY.yml`

---

## Change History

| Version | Date       | Changes                             |
| ------- | ---------- | ----------------------------------- |
| 1.0.0   | 2026-01-08 | Initial exception management system |

---

**Document Authority:** Platform Engineering
**Next Review:** 2026-02-08 (or before MVP-5 kickoff)
