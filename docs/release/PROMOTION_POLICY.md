# RC → GA Promotion Policy

**Version:** 1.0.0
**Last Updated:** 2026-01-09
**Owner:** Release Engineering

This document defines the policy for promoting Release Candidate (RC) tags to General Availability (GA) releases. Promotion is strictly non-destructive: no rebuilding, no regeneration of evidence—only verification and publication of immutable artifacts.

---

## Core Principles

### 1. Immutability

GA releases **must** contain byte-identical artifacts from the originating RC release:

- Evidence bundle (SHA256 verified)
- Trust snapshot (schema-validated)
- SBOM artifacts (CycloneDX, SPDX)
- Provenance attestations (SLSA)
- Release notes (carried over or deterministically regenerated)

**Rationale:** "Publish what was tested." The artifacts verified during RC validation are the exact artifacts released to customers.

### 2. No Rebuilds

Promotion **must not**:

- Re-run compilation or build steps
- Regenerate SBOMs or evidence bundles
- Re-sign artifacts (original signatures are carried over)

Promotion **may only**:

- Verify existing artifacts
- Compute and compare digests
- Create tags and GitHub Releases
- Emit attestation records

### 3. Traceability

Every GA release must maintain full traceability:

- GA tag → RC tag → Commit SHA
- All artifacts linked by digest
- Approval records preserved for audit

---

## Preconditions

A GA promotion is permitted only when **all** of the following are true:

| Precondition | Verification Method |
|--------------|---------------------|
| RC tag exists | `git tag --list ${RC_TAG}` |
| RC points to commit on `main` | `git merge-base --is-ancestor ${RC_SHA} origin/main` |
| GA gate succeeded for commit | Check `ga / gate` workflow status via GitHub API |
| RC GitHub Release exists | `gh release view ${RC_TAG}` |
| Required assets present | Download and verify each asset exists |
| No active change freeze | `scripts/release/enforce_freeze_gate.sh --mode ga` |
| Evidence bundle validates | Manifest hash verification passes |
| Trust snapshot validates | JSON schema validation passes |

### Required RC Release Assets

The following assets **must** be present on the RC release:

| Asset | Pattern | Purpose |
|-------|---------|---------|
| Evidence Bundle | `evidence*.tar.gz` | Complete verification evidence |
| SHA256SUMS | `SHA256SUMS` or `MANIFEST.sha256` | Integrity verification |
| Trust Snapshot | `trust-snapshot*.json` | Security state record |
| SBOM (CycloneDX) | `sbom-cyclonedx.json` | Dependency inventory |
| Provenance | `*.intoto.jsonl` | SLSA L3 provenance |

---

## Authorization

### Who Can Promote

Promotion to GA requires:

1. **Initiator:** Member of `@release-captains` team
2. **Environment Approval:** Two-person approval from `ga-release` environment reviewers
3. **Not During Freeze:** Change freeze must not be active (or override approved)

### Approval Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Release        │     │  Environment    │     │  Publish        │
│  Captain        │────▶│  Approval       │────▶│  GA Release     │
│  Initiates      │     │  (2 reviewers)  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Promotion Process

### Step 1: Resolve Tags

```
RC Tag:  vX.Y.Z-rc.N
GA Tag:  vX.Y.Z (strip -rc.N suffix)
Commit:  Same SHA as RC tag
```

### Step 2: Verify Preconditions

1. Verify RC tag exists and points to main
2. Verify all required assets present on RC release
3. Verify GA gate status for commit
4. Check freeze gate status

### Step 3: Download and Verify Assets

1. Download all RC release assets
2. Compute SHA256 for each asset
3. Store digests in `promotion/digests.json`
4. Verify evidence bundle manifest integrity
5. Validate trust snapshot against schema

### Step 4: Create GA Tag

```bash
# Create annotated GA tag pointing to same SHA
git tag -a vX.Y.Z ${RC_SHA} -m "GA release vX.Y.Z (promoted from ${RC_TAG})"
git push origin vX.Y.Z
```

**Idempotency:** If GA tag already exists and points to same SHA, proceed. If it points elsewhere, fail.

### Step 5: Create GA Release

1. Create GitHub Release for GA tag (draft by default)
2. Upload exact RC assets (re-upload from downloaded copies)
3. Attach promotion artifacts:
   - `promotion/digests.json`
   - `promotion/summary.md`
4. Set release notes (carry over from RC or regenerate from immutable inputs)
5. Publish release (requires environment approval)

---

## Immutability Guarantees

### Digest Verification

Every asset in the GA release must match the corresponding RC asset:

```json
{
  "version": "1.0.0",
  "promotion": {
    "rc_tag": "v4.1.2-rc.1",
    "ga_tag": "v4.1.2",
    "promoted_at": "2026-01-09T22:00:00Z"
  },
  "digests": {
    "evidence.tar.gz": "sha256:abc123...",
    "sbom-cyclonedx.json": "sha256:def456...",
    "trust-snapshot.json": "sha256:ghi789..."
  },
  "verification": {
    "all_matched": true,
    "evidence_manifest_valid": true,
    "trust_snapshot_schema_valid": true
  }
}
```

### What Happens on Mismatch

If any digest comparison fails:

1. Promotion is **immediately aborted**
2. No GA tag is created
3. Detailed error report is generated
4. Alert sent to release-engineering channel

---

## Post-Release Verification

After GA release is published, the `release-post-verify.yml` workflow:

1. Downloads GA release assets
2. Re-validates all digests
3. Re-validates evidence manifest
4. Re-validates trust snapshot schema
5. Verifies signatures/attestations if present
6. Emits `ga-attestation.json` with PASS/FAIL status

### GA Attestation

```json
{
  "version": "1.0.0",
  "attestation_type": "ga-release-verification",
  "ga_tag": "v4.1.2",
  "rc_tag": "v4.1.2-rc.1",
  "commit_sha": "abc123def456...",
  "run_id": 12345678,
  "generated_at_utc": "2026-01-09T22:30:00Z",
  "verification": {
    "evidence_bundle": {
      "digest": "sha256:...",
      "manifest_valid": true
    },
    "trust_snapshot": {
      "digest": "sha256:...",
      "schema_valid": true
    },
    "signatures": {
      "present": true,
      "verified": true
    },
    "provenance": {
      "slsa_level": 3,
      "verified": true
    }
  },
  "attestation_status": "PASS"
}
```

---

## Idempotency

The promotion process is idempotent:

| Scenario | Behavior |
|----------|----------|
| GA release doesn't exist | Create new release with RC assets |
| GA release exists with matching digests | Skip re-upload, proceed to verification |
| GA release exists with mismatched digests | **FAIL** - manual investigation required |
| GA tag exists pointing to same SHA | Use existing tag |
| GA tag exists pointing to different SHA | **FAIL** - conflicting release |

---

## Rollback

### Yanking a Bad GA Release

If a critical issue is discovered after GA promotion:

1. **Mark as pre-release:** `gh release edit vX.Y.Z --prerelease`
2. **Document issue:** Add warning to release notes
3. **Create hotfix:** Follow hotfix lane process (vX.Y.Z+1)
4. **Do not delete:** Releases should never be deleted for auditability

### Investigation Steps

1. Download GA and RC assets
2. Compare digests to identify any tampering
3. Review promotion workflow run logs
4. Check if RC release was modified after promotion

---

## Workflow Reference

### Promotion Workflow

```yaml
# .github/workflows/release-promote-ga.yml
workflow_dispatch:
  inputs:
    rc_tag:
      description: "RC tag to promote (e.g., v4.1.2-rc.1)"
      required: true
    publish:
      description: "Publish release (requires approval)"
      default: true
    notes_mode:
      description: "carry_over or regenerate"
      default: "carry_over"
```

### Post-Verification Workflow

```yaml
# .github/workflows/release-post-verify.yml
on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      ga_tag:
        description: "GA tag to verify"
        required: true
```

---

## Related Documentation

- [Release GA Pipeline](../ci/RELEASE_GA_PIPELINE.md)
- [Promotion Runbook](./PROMOTION_RUNBOOK.md)
- [Hotfix Lane Process](./HOTFIX_LANE.md)
- [Change Freeze Policy](../ci/CHANGE_FREEZE_MODE.md)
