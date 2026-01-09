# Release Policy

**Authority:** `docs/SUMMIT_READINESS_ASSERTION.md` and the governance canon (`docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`). The Summit Readiness Assertion is the preflight anchor that must be referenced before any release action.

## Versioning Scheme

- **Source of truth:** Root `package.json` version (SemVer).
- **Release candidate tag:** `vX.Y.Z-rc.N`.
- **GA tag:** `vX.Y.Z`.

RC numbering is deterministic: the next RC number is derived from the highest existing tag for the same base version.

## Who Can Trigger RC Creation

- **Release Captain** or designated operators with write access to tags.
- **Governed Exceptions:** Any non-standard trigger must be logged as a governed exception and referenced in the release notes.

## Preconditions (Non-Negotiable)

1. **Main lineage:** The target commit is reachable from `main` (unless an explicit governed exception is declared).
2. **GA Gate success:** `ga-gate.yml` is green for the target SHA.
3. **Evidence availability:** GA evidence bundle artifact exists and validates against the evidence manifest.
4. **Trust Snapshot availability:** Trust snapshot JSON exists and validates against `trust/trust-snapshot.schema.json`.
5. **Deterministic release notes:** Release notes must be assembled from immutable inputs only:
   - Git SHA
   - Workflow run id
   - Evidence manifest
   - Trust snapshot JSON

## RC Tagging Policy

- **Build + verify first:** release readiness checks run before tagging.
- **Tag creation is explicit:** RC tags are created only by the `release-rc.yml` workflow with `confirm_tag=true`.
- **No accidental tags:** any manual tagging outside the workflow is a governed exception and must be documented.

## Draft Release Policy

- **Draft by default:** GitHub Releases created for RC tags are draft-only.
- **Explicit publish:** Promotion to a public RC requires the `rc-release-publish` environment approval.
- **Immutable attachments:** Evidence bundle, trust snapshot, and release notes are attached as immutable assets.

## RC → GA Promotion

- **Lineage enforcement:** GA tags must point to a previously validated RC SHA.
- **Publish what was tested:** GA uses the RC bundle as the authoritative artifact set.
- **Authority files:** `docs/ci/REQUIRED_CHECKS_POLICY.yml` and `docs/ci/RELEASE_GA_PIPELINE.md` are binding.

## Governed Exceptions

Exceptions are not bypasses; they are governed exceptions. Each exception must:

- Reference the authority files above.
- Be recorded in release notes with rationale and approver.
- Be time-bounded and reversible.

## Alignment Requirements

All release artifacts must align on the same definitions and authority sources:

- `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- `trust/trust-snapshot.schema.json`
- `docs/release/RELEASE_POLICY.md`
- `scripts/release/release-notes.policy.json`
- `docs/SUMMIT_READINESS_ASSERTION.md`
