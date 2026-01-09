# RC Release Runbook

**Authority:** `docs/SUMMIT_READINESS_ASSERTION.md` and `docs/release/RELEASE_POLICY.md`.

## Trigger an RC

1. Navigate to **Actions → Release RC Pipeline**.
2. Provide optional inputs:
   - `version` (defaults to `package.json` version)
   - `rc_number` (auto-increments if omitted)
   - `target_sha` (defaults to `main` HEAD)
   - `evidence_workflow` / `evidence_artifact` (defaults to GA evidence pipeline)
   - `trust_workflow` / `trust_artifact` (set to the trust snapshot workflow if different)
3. Set `confirm_tag=true` to create the RC tag.
4. Set `publish=true` only if you have approval in the `rc-release-publish` environment.

## Preconditions Checklist

- GA Gate is green for the target SHA.
- Evidence bundle artifact exists and validates.
- Trust snapshot artifact exists and validates.
- Release notes assemble deterministically.

The workflow enforces these gates before tagging.

## Validate Assets

After the workflow completes, verify:

- `release_notes.md` and `release_notes.json` are attached to the draft release.
- Evidence bundle ZIP is attached and its digest matches the release notes.
- Trust snapshot JSON is attached and its digest matches the release notes.

## Promote RC (Draft → Published)

1. Confirm the draft release is correct.
2. Re-run the workflow with `publish=true`.
3. Approve the `rc-release-publish` environment gate.

## RC → GA Promotion (Next Step)

GA promotion is handled by `release-ga-pipeline.yml` and must reuse the RC lineage and evidence bundle.

## Governed Exceptions

If a release must use a non-main SHA or manual tagging, record it as a governed exception in the release notes and the release log.
