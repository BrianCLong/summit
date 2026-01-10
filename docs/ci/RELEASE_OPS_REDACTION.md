# Release Ops Redaction Layer

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

The Release Ops Redaction Layer provides deterministic, policy-driven content sanitization for dual-mode publishing:

| Mode          | Audience    | Distribution       | Content                             |
| ------------- | ----------- | ------------------ | ----------------------------------- |
| **Sanitized** | Public      | GitHub Pages       | Safe summary, no sensitive details  |
| **Full**      | Maintainers | Workflow artifacts | Complete content including blockers |

### Why Redaction?

The Release Ops Single Page consolidates valuable release status information, but some content is sensitive:

- **Issue bodies** may contain customer data or internal discussions
- **Internal links** may expose operational infrastructure
- **Blocker details** may reveal security vulnerabilities
- **State files** contain operational metadata

The redaction layer ensures we can publish a useful public view without exposing sensitive content.

---

## Render Modes

### Sanitized Mode (Public)

Used for GitHub Pages publishing. Content is processed to:

1. **Remove** sensitive sections entirely
2. **Collapse** detailed lists to summary counts
3. **Redact** forbidden patterns (tokens, internal links)
4. **Verify** no sensitive patterns remain

```bash
# Generate sanitized output
scripts/release/redact_release_ops_content.sh \
  --in release_ops_single_page.md \
  --out release_ops_single_page_sanitized.md \
  --mode sanitized
```

### Full Mode (Internal)

Used for maintainer artifacts. Content passes through unchanged:

```bash
# Generate full output (no changes)
scripts/release/redact_release_ops_content.sh \
  --in release_ops_single_page.md \
  --out release_ops_single_page_full.md \
  --mode full
```

---

## What Gets Redacted

### Sections Collapsed (Show Count Only)

| Section           | Replacement                                              |
| ----------------- | -------------------------------------------------------- |
| Top Blockers      | "_{count} blocker(s) - see internal report for details_" |
| Escalation Status | "_{count} escalation(s) in progress_"                    |
| Recent Digest     | "_Daily digest available in internal report_"            |
| Shift Handoff     | "_Handoff notes available in internal report_"           |

### Sections Removed

| Section           | Reason                            |
| ----------------- | --------------------------------- |
| Internal Notes    | May contain sensitive discussions |
| Debug Information | Operational details               |
| State Snapshot    | Internal state data               |
| Detailed Blockers | Issue bodies, internal links      |
| Issue Bodies      | May contain sensitive content     |

### Forbidden Patterns

The following patterns are actively detected and replaced:

| Pattern                               | Matches             | Replaced With        |
| ------------------------------------- | ------------------- | -------------------- |
| `github.com/.../issues/#issuecomment` | Issue comment links | `[issue comment]`    |
| `github.com/.../pull/#discussion`     | PR discussion links | `[PR discussion]`    |
| `\.(internal\|corp\|local)`           | Internal domains    | `[internal]`         |
| `@internal.example.com`               | Internal emails     | `[email]`            |
| `ghp_*`, `gho_*`, etc.                | GitHub tokens       | `[REDACTED_TOKEN]`   |
| `Bearer *`                            | Bearer tokens       | `Bearer [REDACTED]`  |
| `api_key=*`                           | API keys            | `[REDACTED_SECRET]`  |
| `_state.json`                         | State file refs     | `[state]`            |
| `state-snapshot/`                     | Snapshot paths      | `[snapshot]`         |
| `actions/runs/123456...`              | Workflow run IDs    | `actions/runs/[run]` |
| `@platform-team`                      | Team mentions       | `@[team]`            |

### Links

Only these link patterns are preserved in sanitized mode:

- Repository root: `https://github.com/{org}/{repo}/`
- Releases page: `https://github.com/{org}/{repo}/releases`
- Actions page: `https://github.com/{org}/{repo}/actions`
- File links: `https://github.com/{org}/{repo}/blob/...`
- Documentation: `https://docs.*`
- Local files: `*.html`, `*.md`, `*.json`

All other links are converted to plain text.

---

## Policy Configuration

### Location

```
docs/ci/REDACTION_POLICY.yml
```

### Structure

```yaml
version: "1.0.0"

modes:
  sanitized:
    description: "Public-facing view for GitHub Pages"
  full:
    description: "Internal maintainer view"

sections:
  allowed_in_sanitized:
    - "Release Snapshot"
    - "Summary"
    ...

  collapse_in_sanitized:
    - heading: "Top Blockers"
      replacement: "_{count} blocker(s)..."
      max_visible: 0

  remove_in_sanitized:
    - "Internal Notes"
    - "Debug Information"
    ...

forbidden_patterns:
  - pattern: "regex pattern"
    description: "What this matches"
    replacement: "[REDACTED]"

allowed_links:
  - pattern: "^https://github\\.com/..."
    description: "Repository links"

verification:
  fail_on_forbidden_pattern: true
```

### Modifying the Policy

1. **Edit the policy file** in `docs/ci/REDACTION_POLICY.yml`
2. **Test locally** with the redaction script:
   ```bash
   scripts/release/redact_release_ops_content.sh \
     --in test_input.md \
     --mode sanitized \
     --dry-run \
     --verbose
   ```
3. **Verify** no forbidden patterns remain:
   ```bash
   scripts/release/redact_release_ops_content.sh \
     --in output.md \
     --verify-only
   ```
4. **Create a PR** with policy changes
5. **Get review** from Platform Engineering

---

## Verification

### Automatic Verification

The `build_release_ops_site.sh` script automatically verifies:

1. All published files are scanned for forbidden patterns
2. Build fails if any patterns are detected
3. Workflow logs show which patterns triggered

### Manual Verification

```bash
# Verify a specific file
scripts/release/redact_release_ops_content.sh \
  --in site/release-ops/release_ops_single_page.md \
  --verify-only \
  --policy docs/ci/REDACTION_POLICY.yml

# Check exit code
echo $?  # 0 = pass, 1 = forbidden patterns found
```

### Verification in CI

The Pages publish workflow includes verification:

```yaml
- name: Verify Site Contents
  run: |
    # Verify no state files leaked
    if find site/release-ops -name "*_state.json" | grep -q .; then
      echo "::error::State files found!"
      exit 1
    fi
```

---

## Workflows

### Public Pages (Sanitized)

```
publish-release-ops-pages.yml
```

- Triggered by: Orchestrator completion
- Uses: Sanitized mode
- Output: GitHub Pages at `https://{owner}.github.io/{repo}/`

### Internal Package (Full)

```
publish-release-ops-internal.yml
```

- Triggered by: Manual dispatch only
- Uses: Full mode
- Output: Artifact `release-ops-internal-latest`

---

## Accessing Full Content

### For Maintainers

1. **Run internal workflow:**

   ```bash
   gh workflow run publish-release-ops-internal.yml
   ```

2. **Download artifact:**

   ```bash
   gh run download --name release-ops-internal-latest
   ```

3. **Or use orchestrator artifacts directly:**
   ```bash
   gh run download <run_id> --name release-ops-cycle-<run_id>
   ```

### Latest Run Pointer

The public Pages site includes a "Latest Run" indicator that points maintainers to the workflow for full details:

```
https://github.com/{org}/{repo}/actions/workflows/release-ops-orchestrator.yml
```

---

## Troubleshooting

### "Forbidden patterns detected" Error

The build failed because sensitive content remained after redaction.

1. Check workflow logs for which pattern was detected
2. Review the source markdown for that pattern
3. Either:
   - Add the pattern to `forbidden_patterns` with appropriate replacement
   - Modify the source to not include sensitive content

### Redaction Removed Too Much

The sanitized output is missing expected content.

1. Review `collapse_in_sanitized` settings
2. Check if section heading matches exactly
3. Adjust `max_visible` to show more items

### Links Not Working

Links were converted to plain text unexpectedly.

1. Check `allowed_links` patterns in policy
2. Ensure link format matches allowed patterns
3. Add new pattern if appropriate

---

## Testing

### Running Tests Locally

```bash
# Run the full test suite
scripts/release/tests/redaction_layer.test.sh

# Run with verbose output
scripts/release/tests/redaction_layer.test.sh --verbose
```

### What the Tests Verify

The test suite (`scripts/release/tests/redaction_layer.test.sh`) verifies:

1. **Prerequisites**: Scripts and policy files exist and are executable
2. **Sanitizer Execution**: Redaction script runs successfully
3. **Verification**: `--verify-only` passes on sanitized output
4. **Pattern Detection**: `--verify-only` correctly detects patterns in raw input
5. **Content Assertions**: All forbidden patterns are absent from output
6. **Required Markers**: Collapse markers and redaction placeholders are present
7. **HTML Rendering**: Sanitized HTML doesn't reintroduce forbidden patterns
8. **Full Mode**: Passthrough mode preserves content

### Test Fixtures

Located in `scripts/release/tests/fixtures/`:

| File                                | Purpose                                 |
| ----------------------------------- | --------------------------------------- |
| `redaction_input.md`                | Input containing all forbidden patterns |
| `redaction_expected_assertions.txt` | Patterns that MUST NOT / MUST appear    |

### Updating Fixtures When Policy Changes

1. **Add new forbidden patterns**:
   - Add the pattern to `REDACTION_POLICY.yml`
   - Add examples to `redaction_input.md`
   - Add `MUST_NOT_CONTAIN:` assertions
   - Add `MUST_CONTAIN:` for expected replacements

2. **Change collapse behavior**:
   - Update expected `MUST_CONTAIN:` markers in assertions file

3. **Run tests locally**:

   ```bash
   scripts/release/tests/redaction_layer.test.sh --verbose
   ```

4. **Verify CI passes** on PR

### CI Testing

The `redaction-tests.yml` workflow runs automatically on PRs that modify:

- `docs/ci/REDACTION_POLICY.yml`
- `scripts/release/redact_release_ops_content.sh`
- `scripts/release/build_release_ops_site.sh`
- `scripts/release/render_release_ops_single_page_html.*`
- `.github/workflows/publish-release-ops-pages.yml`
- `scripts/release/tests/**`

### What Failure Means

If tests fail, it indicates:

1. **Forbidden pattern not redacted**: The sanitizer missed a pattern
   - Fix: Update `redact_release_ops_content.sh` to handle the pattern

2. **Missing expected marker**: A collapse or replacement didn't happen
   - Fix: Check section heading matching in sanitizer

3. **Verify-only failed on sanitized output**: Sanitizer is incomplete
   - Fix: Debug which pattern is leaking through

**Do NOT merge until all tests pass.**

### Quick Test Commands

```bash
# Just run redaction on fixture
scripts/release/redact_release_ops_content.sh \
  --in scripts/release/tests/fixtures/redaction_input.md \
  --mode sanitized \
  --verbose

# Verify a specific file
scripts/release/redact_release_ops_content.sh \
  --in path/to/file.md \
  --verify-only
```

---

## References

- **Redaction Script**: `scripts/release/redact_release_ops_content.sh`
- **Policy File**: `docs/ci/REDACTION_POLICY.yml`
- **Build Script**: `scripts/release/build_release_ops_site.sh`
- **Pages Workflow**: `.github/workflows/publish-release-ops-pages.yml`
- **Internal Workflow**: `.github/workflows/publish-release-ops-internal.yml`
- **Test Workflow**: `.github/workflows/redaction-tests.yml`
- **Test Script**: `scripts/release/tests/redaction_layer.test.sh`
- **Test Fixtures**: `scripts/release/tests/fixtures/`
- **Health Badge**: `docs/ci/REDACTION_HEALTH.md`
- **Triage Packet**: `docs/ci/REDACTION_TRIAGE_PACKET.md`
- **Allowlist**: `docs/ci/PAGES_PUBLISH_ALLOWLIST.md`

---

## Change History

| Version | Date       | Changes                                |
| ------- | ---------- | -------------------------------------- |
| 1.0.0   | 2026-01-08 | Initial redaction layer implementation |
| 1.1.0   | 2026-01-08 | Added CI tests and test fixtures       |
| 1.2.0   | 2026-01-08 | Added health badge and status panel    |
| 1.3.0   | 2026-01-08 | Added triage packet generator          |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
