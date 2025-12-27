# Disclosure Pack Redaction Rules

## Overview

Disclosure packs must be scrubbed for PII and secret material before they are archived or shared. The redaction step runs as part of `scripts/generate_disclosure_pack.sh` and applies a policy-as-code ruleset maintained in the compliance directory.

## Policy Inputs

- **PII denylist**: `compliance/pii-denylist.txt`
  - Each line is a regex pattern (case-insensitive).
  - Lines starting with `#` are comments.
- **Secret patterns**: `compliance/secret-patterns.json`
  - JSON array of `{ "name", "pattern" }` rules.
  - Patterns are regexes (case-insensitive).

## Redaction Behavior

- Files under the disclosure pack directory are scanned.
- Text matches are replaced with `[REDACTED]`.
- Binary files are skipped and reported.
- The redaction step fails if any denylisted or secret patterns remain after processing.

## Updating Rules

1. Add or adjust patterns in the denylist or secret patterns file.
2. Run `python3 scripts/compliance/redact_disclosure_pack.py --pack-dir <path>` against a sample pack.
3. Update or add tests in `tests/test_disclosure_pack_redaction.py` for new patterns.

## Evidence

Redaction is enforced during disclosure pack creation and is also covered by CI tests to prevent regressions.
