# Disclosure Pack Redaction Rules

## Overview

The disclosure pack is redacted before packaging to prevent PII or secret leakage.
The redaction step runs in `scripts/generate_disclosure_pack.sh` and applies both
literal denylist entries and regex-based secret patterns.

## Sources of Redaction Rules

### Literal denylist

- **File:** `compliance/pii-denylist.txt`
- **Format:** One literal string per line (case-sensitive).
- **Notes:** Lines starting with `#` are ignored.

Use the denylist for known values that must never appear in disclosure bundles
(e.g., customer identifiers or test fixtures that should be scrubbed).

### Secret & PII patterns

- **File:** `compliance/secret-patterns.json`
- **Format:** JSON array of objects with:
  - `name` — human-readable rule identifier.
  - `pattern` — JavaScript regex string.
  - `flags` — regex flags (defaults to `g`).
  - `replacement` — replacement string (defaults to `[REDACTED]`).

Use these patterns to capture common secrets/PII formats (email, SSN, API keys,
access tokens, etc.).

## Built-in Patterns

The default `secret-patterns.json` includes detection for:

| Pattern                 | Description                   | Replacement              |
| ----------------------- | ----------------------------- | ------------------------ |
| `email`                 | Email addresses               | `[REDACTED_EMAIL]`       |
| `ssn`                   | US Social Security Numbers    | `[REDACTED_SSN]`         |
| `aws-access-key-id`     | AWS Access Key IDs            | `AKIA[REDACTED]`         |
| `aws-secret-access-key` | AWS Secret Keys               | `[REDACTED_AWS_SECRET]`  |
| `github-token`          | GitHub Personal Access Tokens | `ghp_[REDACTED]`         |
| `github-oauth`          | GitHub OAuth Tokens           | `gho_[REDACTED]`         |
| `slack-token`           | Slack Bot/User Tokens         | `xox*-[REDACTED]`        |
| `jwt-token`             | JSON Web Tokens               | `[REDACTED_JWT]`         |
| `private-key`           | Private Key Headers           | `[REDACTED_PRIVATE_KEY]` |
| `credit-card`           | Credit Card Numbers           | `[REDACTED_CC]`          |
| `api-key-generic`       | Generic API Key Assignments   | `[REDACTED_API_KEY]`     |
| `password-assignment`   | Password Assignments          | `[REDACTED_PASSWORD]`    |

## How redaction is enforced

1. The pack build step runs `scripts/compliance/redact-disclosure-pack.cjs` against
   the staging directory.
2. The script rewrites matching content in all text files.
3. A summary is printed showing files modified and total redactions.

## Local verification

To scan or redact a pack manually:

```bash
# Dry run - show what would be redacted
node scripts/compliance/redact-disclosure-pack.cjs artifacts/disclosure_pack/<PACK_DIR> --dry-run --verbose

# Actually redact
node scripts/compliance/redact-disclosure-pack.cjs artifacts/disclosure_pack/<PACK_DIR> --verbose
```

Provide alternate rule files if needed:

```bash
node scripts/compliance/redact-disclosure-pack.cjs <PACK_DIR> \
  --denylist /path/to/denylist.txt \
  --patterns /path/to/secret-patterns.json
```

## Adding New Rules

### Adding a denylist entry

Edit `compliance/pii-denylist.txt` and add the literal string:

```
CUSTOMER_SECRET_ID_12345
```

### Adding a pattern rule

Edit `compliance/secret-patterns.json` and add a new object:

```json
{
  "name": "my-custom-token",
  "pattern": "mytoken_[A-Za-z0-9]{32}",
  "flags": "g",
  "replacement": "mytoken_[REDACTED]"
}
```

## CI Integration

The redaction script is called automatically in the disclosure pack workflow:

```yaml
- name: Redact disclosure pack
  run: node scripts/compliance/redact-disclosure-pack.cjs artifacts/disclosure_pack --verbose
```

## Security Considerations

- Always run redaction before shipping any disclosure pack
- Review the summary output for unexpected patterns
- Consider running in `--dry-run` mode first to preview changes
- Keep the denylist updated with project-specific sensitive values
- Regularly update patterns based on new token formats

## Related Documents

- [Governance Loop](../GOVERNANCE_LOOP.md)
- [Security Policy](../../SECURITY/README.md)
