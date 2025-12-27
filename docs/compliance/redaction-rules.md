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

## How redaction is enforced

- The pack build step runs `scripts/compliance/redact-disclosure-pack.cjs` against
  the staging directory.
- The script rewrites matching content and **fails** if any denylist or pattern
  match remains after redaction.

## Local verification

To scan or redact a pack manually:

```bash
node scripts/compliance/redact-disclosure-pack.cjs artifacts/disclosure_pack/<PACK_DIR>
```

Provide alternate rule files if needed:

```bash
node scripts/compliance/redact-disclosure-pack.cjs <PACK_DIR> \
  --denylist /path/to/denylist.txt \
  --patterns /path/to/secret-patterns.json
```
