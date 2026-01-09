# Release Ops Pages

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

Release Ops Pages publishes a persistent, publicly accessible **sanitized** view of the Release Ops Single Page to GitHub Pages. This provides stakeholders with a stable URL to check release status without downloading workflow artifacts.

**Important:** The Pages site shows a **sanitized** view. Sensitive content (blocker details, issue bodies, internal links) is redacted. For full details, maintainers should use the workflow artifacts or the internal publishing workflow.

See [RELEASE_OPS_REDACTION.md](RELEASE_OPS_REDACTION.md) for redaction policy details.

### Why GitHub Pages?

| Problem                                            | Solution                          |
| -------------------------------------------------- | --------------------------------- |
| Artifacts are ephemeral (30 days)                  | Pages provides permanent URL      |
| Must download artifact to view                     | One-click browser access          |
| No stable link to share                            | `https://{org}.github.io/{repo}/` |
| Non-technical stakeholders struggle with artifacts | Simple web page                   |

---

## URLs

### Pages URL Format

```
https://{owner}.github.io/{repo}/
```

For example:

- `https://myorg.github.io/myrepo/`

### Direct Links

| Page                     | URL                                                             |
| ------------------------ | --------------------------------------------------------------- |
| Landing Page             | `https://{owner}.github.io/{repo}/`                             |
| Single Page Summary      | `https://{owner}.github.io/{repo}/release_ops_single_page.html` |
| Dashboard Summary (JSON) | `https://{owner}.github.io/{repo}/dashboard_summary.json`       |

---

## What Gets Published

### Published Content

| File                           | Description                             |
| ------------------------------ | --------------------------------------- |
| `index.html`                   | Landing page with navigation links      |
| `release_ops_single_page.html` | Consolidated release status summary     |
| `release_ops_single_page.md`   | Source markdown                         |
| `cycle_summary.md`             | Orchestrator run configuration          |
| `dashboard_summary.json`       | **Sanitized** release candidate summary |

### NOT Published (for security)

- State snapshots (`*_state.json`)
- Full `dashboard.json` (may contain sensitive blocker details)
- Internal reports (blocked issues, routing, escalation)
- Any file not on the explicit allowlist

See [PAGES_PUBLISH_ALLOWLIST.md](PAGES_PUBLISH_ALLOWLIST.md) for the complete list.

---

## How Publishing Works

### Trigger

Pages is automatically updated after each successful Release Ops Orchestrator run:

```yaml
on:
  workflow_run:
    workflows: ["Release Ops Orchestrator"]
    types: [completed]
```

### Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Pages Publish Pipeline                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Orchestrator completes successfully                            │
│     └── Triggers publish-release-ops-pages.yml                     │
│                                                                     │
│  2. Download orchestrator artifacts                                │
│     └── gh run download <run_id> -n release-ops-cycle-<run_id>    │
│                                                                     │
│  3. Build sanitized site                                           │
│     └── scripts/release/build_release_ops_site.sh                 │
│         - Copies only allowlisted files                           │
│         - Creates sanitized dashboard_summary.json                │
│         - Generates Pages-specific index.html                     │
│                                                                     │
│  4. Verify no blocked content                                      │
│     └── Fails if state files or sensitive data detected           │
│                                                                     │
│  5. Deploy to GitHub Pages                                         │
│     └── actions/deploy-pages                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Manual Publishing

### Via GitHub Actions UI

1. Navigate to Actions → "Publish Release Ops Pages"
2. Click "Run workflow"
3. Optionally specify:
   - `run_id`: Specific orchestrator run to publish from
   - `dry_run`: Test without actually publishing
4. Click "Run workflow"

### Via CLI

```bash
# Publish from latest successful orchestrator run
gh workflow run publish-release-ops-pages.yml

# Publish from specific run
gh workflow run publish-release-ops-pages.yml \
  -f run_id=12345678

# Dry run to see what would be published
gh workflow run publish-release-ops-pages.yml \
  -f dry_run=true
```

---

## Building Locally

To test the site build locally:

```bash
# Create sample artifacts (or use real ones)
mkdir -p artifacts/release-train
cp /path/to/orchestrator/artifacts/* artifacts/release-train/

# Build the site
./scripts/release/build_release_ops_site.sh \
  --artifacts-dir artifacts/release-train \
  --site-dir site/release-ops \
  --verbose

# Or dry run
./scripts/release/build_release_ops_site.sh \
  --artifacts-dir artifacts/release-train \
  --dry-run

# View locally
open site/release-ops/index.html
```

---

## Safety Controls

### Sanitized Mode

All content published to Pages is processed through the redaction layer:

1. **Section Collapsing**: Sensitive sections (Blockers, Escalation, Digest, Handoff) are collapsed to summary counts
2. **Pattern Redaction**: Forbidden patterns (tokens, internal links, state refs) are replaced
3. **Link Sanitization**: Only allowed link patterns are preserved
4. **Verification**: Build fails if any forbidden patterns remain

```bash
# How redaction is applied during build
scripts/release/redact_release_ops_content.sh \
  --in single_page.md \
  --out single_page_sanitized.md \
  --mode sanitized \
  --policy docs/ci/REDACTION_POLICY.yml
```

See [RELEASE_OPS_REDACTION.md](RELEASE_OPS_REDACTION.md) for full details.

### Allowlist Enforcement

The build script uses an explicit allowlist:

```bash
ALLOWLIST=(
    "index.html"
    "release_ops_single_page.html"
    "release_ops_single_page.md"
    "cycle_summary.md"
    "dashboard_summary.json"
)
```

Files not on this list are **not copied** to the site.

### Blocklist Patterns

Additionally, certain patterns are explicitly blocked:

```bash
BLOCKLIST_PATTERNS=(
    "state-snapshot/*"
    "*_state.json"
    "dashboard.json"
    "blocked_issues_report.md"
    ...
)
```

### Workflow Verification

Before deploying, the workflow verifies:

- No `*_state.json` files in site directory
- No `dashboard.json` (only `dashboard_summary.json`)
- No `state-snapshot/` directory

If blocked content is detected, the workflow triggers automatic rollback (see below).

### Automatic Rollback

When the safety gate fails or redaction health is **FAIL**, the workflow automatically:

1. **Restores** the last known-good snapshot from the `release-ops-pages-snapshots` branch
2. **Deploys** the restored snapshot to Pages
3. **Generates** a rollback report visible on the site

This ensures the public site remains continuously available with safe content, even when a build has issues.

| Condition                    | Behavior                                   |
| ---------------------------- | ------------------------------------------ |
| Health OK/WARN + Safety Pass | Deploy current build, store snapshot       |
| Health FAIL                  | Restore and deploy last snapshot           |
| Safety Gate Fail             | Restore and deploy last snapshot           |
| No snapshot exists           | Workflow fails with bootstrap instructions |

See [PAGES_ROLLBACK.md](PAGES_ROLLBACK.md) for full details.

---

## Disabling Publishing

### Temporarily Disable

1. Go to Actions → "Publish Release Ops Pages"
2. Click "..." menu → "Disable workflow"

### Permanently Remove

1. Delete `.github/workflows/publish-release-ops-pages.yml`
2. Go to Settings → Pages → Change source to "None"

### Unpublish Existing Content

1. Go to Settings → Pages
2. Set source to "None" (or select a different folder)

---

## Troubleshooting

### Pages Not Updating

1. Check if orchestrator run succeeded
2. Check publish workflow logs for errors
3. Verify GitHub Pages is enabled in Settings → Pages

### "Blocked content detected" Error

The verification step found sensitive content that shouldn't be published.

1. Check the error message for which file was detected
2. Verify `build_release_ops_site.sh` allowlist is correct
3. Check if a new file was added to artifacts that needs allowlist review

### 404 on Pages URL

1. Verify Pages is enabled: Settings → Pages
2. Check deployment history in the workflow
3. Ensure `index.html` exists in the published content

### Artifact Download Failed

```
::error::Failed to download artifact release-ops-cycle-{run_id}
```

1. Verify the run ID exists and completed successfully
2. Check if artifacts have expired (30-day retention)
3. Ensure `GITHUB_TOKEN` has read access to artifacts

---

## Architecture

### File Flow

```
Orchestrator Run
      │
      ▼
artifacts/release-train/
├── index.html
├── release_ops_single_page.html
├── release_ops_single_page.md
├── dashboard.json              ← Not published
├── blocked_issues_report.md    ← Not published
├── state-snapshot/             ← Not published
│   └── *.json
└── ...
      │
      ▼  build_release_ops_site.sh
      │
site/release-ops/
├── index.html                  ← Pages landing (regenerated)
├── release_ops_single_page.html
├── release_ops_single_page.md
├── cycle_summary.md
└── dashboard_summary.json      ← Sanitized excerpt
      │
      ▼  actions/deploy-pages
      │
GitHub Pages
https://{owner}.github.io/{repo}/
```

---

## For Maintainers: Full Content Access

The Pages site shows sanitized content. To access full (non-redacted) content:

### Option 1: Orchestrator Artifacts

Download artifacts directly from the orchestrator run:

```bash
# Find latest run
gh run list --workflow=release-ops-orchestrator.yml --limit=1

# Download artifacts
gh run download <run_id> --name release-ops-cycle-<run_id>
```

### Option 2: Internal Publishing Workflow

Run the internal publishing workflow:

```bash
gh workflow run publish-release-ops-internal.yml
```

Then download the artifact:

```bash
gh run download --name release-ops-internal-latest
```

### Internal Package Contents

The internal package includes:

| File                                | Description                              |
| ----------------------------------- | ---------------------------------------- |
| `release_ops_single_page_full.html` | Complete HTML with all details           |
| `dashboard.json`                    | Full dashboard including blocker details |
| `blocked_issues_report.md`          | Complete issue bodies                    |
| `routing_report.md`                 | Internal routing decisions               |
| `escalation_report.md`              | Escalation details                       |
| `state/` (optional)                 | State files for debugging                |

---

## References

- **Publish Workflow**: `.github/workflows/publish-release-ops-pages.yml`
- **Internal Workflow**: `.github/workflows/publish-release-ops-internal.yml`
- **Build Script**: `scripts/release/build_release_ops_site.sh`
- **Redaction Script**: `scripts/release/redact_release_ops_content.sh`
- **Redaction Policy**: `docs/ci/REDACTION_POLICY.yml`
- **Redaction Documentation**: `docs/ci/RELEASE_OPS_REDACTION.md`
- **Rollback Documentation**: `docs/ci/PAGES_ROLLBACK.md`
- **Allowlist Documentation**: `docs/ci/PAGES_PUBLISH_ALLOWLIST.md`
- **Single Page Documentation**: `docs/ci/RELEASE_OPS_SINGLE_PAGE.md`
- **Orchestrator Documentation**: `docs/ci/RELEASE_OPS_ORCHESTRATOR.md`

---

## Change History

| Version | Date       | Changes                                        |
| ------- | ---------- | ---------------------------------------------- |
| 1.0.0   | 2026-01-08 | Initial Pages publishing implementation        |
| 1.1.0   | 2026-01-08 | Added redaction layer and dual-mode publishing |
| 1.2.0   | 2026-01-08 | Added automatic rollback on FAIL               |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
