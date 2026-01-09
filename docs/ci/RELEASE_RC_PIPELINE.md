# Release RC Pipeline

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-10

## Overview

The Release RC Pipeline is the canonical workflow that **creates** RC tags from `main`, validates governance gates, assembles deterministic release notes, and creates a **draft** GitHub Release with evidence and trust artifacts attached.

### Key Properties

- **Single source of truth**: One workflow controls RC tagging and release assembly.
- **Policy-driven**: GA Gate and evidence/trust validation are mandatory.
- **Deterministic notes**: Release notes are generated from immutable inputs only.
- **Draft-by-default**: RC releases remain drafts unless explicitly published.

---

## When This Runs

The pipeline runs **only** via manual dispatch:

1. Navigate to **Actions → Release RC Pipeline**
2. Provide optional inputs (version, target SHA, RC number)
3. Set `confirm_tag=true` to create the RC tag
4. Set `publish=true` only with environment approval

No tagging occurs on PR triggers. Tags created outside this workflow are governed exceptions.

---

## Pipeline Stages

### Stage 1: Resolve Target + Tag

- Determines target SHA (defaults to `main` HEAD)
- Enforces main lineage unless a governed exception is declared
- Computes deterministic `vX.Y.Z-rc.N` tag

### Stage 2: Preconditions

- Runs `release:ready` gate
- Confirms `ga-gate.yml` succeeded for the target SHA
- Downloads GA evidence bundle and trust snapshot artifacts
- Validates trust snapshot schema and evidence manifest

### Stage 3: Release Notes Assembly

- Generates `release_notes.md` and `release_notes.json`
- Includes:
  - PR changelog grouped by labels
  - Breaking changes section (explicit)
  - Assurance summary from trust snapshot
  - Evidence digests and manifests

### Stage 4: Tag + Draft Release

- Creates annotated RC tag (only with `confirm_tag=true`)
- Creates or updates **draft** GitHub Release
- Attaches evidence bundle, trust snapshot, SBOMs (optional), and release notes

### Stage 5: Publish (Optional)

- Runs only when `publish=true`
- Requires approval via `rc-release-publish` environment

---

## Generated Artifacts

- `rc-release-notes-{tag}` workflow artifact
- Draft GitHub Release with:
  - GA evidence bundle ZIP
  - Trust snapshot JSON
  - Release notes (MD + JSON)
  - Evidence manifest
  - Optional SBOM files

---

## Usage

### Create RC (Draft Only)

```bash
# Trigger from Actions UI with confirm_tag=true
```

### Publish RC (Explicit Approval)

```bash
# Re-run with publish=true and approve rc-release-publish environment
```

---

## Related Documentation

- `docs/release/RELEASE_POLICY.md`
- `docs/release/RC_RUNBOOK.md`
- `docs/ci/REQUIRED_CHECKS_POLICY.yml`
