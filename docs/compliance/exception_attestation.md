# Exception Approval Attestation Schema

This document defines the JSON schema for the **Exception Approval Attestation**, a cryptographically verifiable record of SOC exception changes.

## Schema Version 1.0

The attestation is a JSON object with the following structure:

```json
{
  "schema_version": "1.0",
  "repo": "owner/repo",
  "commit_sha": "<merge_commit_sha>",
  "ref": "refs/heads/main OR refs/tags/vX.Y.Z",
  "generated_at_utc": "<ISO8601>",
  "source_pr": {
    "number": <int>,
    "url": "<PR URL>",
    "title": "<string>",
    "base_ref": "<string>",
    "head_ref": "<string>",
    "merge_commit_sha": "<sha>",
    "merged_at_utc": "<ISO8601>",
    "author": "<login>"
  },
  "approvals": {
    "required_policy": {
      "codeowners_required": true,
      "min_approvals": <int>,
      "required_teams_or_users": ["<team/user>", ...]
    },
    "reviews": [
      {
        "reviewer": "<login>",
        "state": "APPROVED",
        "submitted_at_utc": "<ISO8601>"
      }
    ],
    "codeowners": {
      "satisfied": true,
      "owners": ["<team/user>", ...]
    }
  },
  "exception_changes": {
    "files": [
      {
        "path": "compliance/exceptions/EXCEPTIONS.yml",
        "diff_type": "modified|added|deleted",
        "diff_summary": "<short human summary>",
        "before_sha256": "<sha256 of canonical normalized before file>",
        "after_sha256": "<sha256 of canonical normalized after file>"
      }
    ],
    "exception_ids_touched": ["EXC-001", "EXC-002", ...],
    "git_patch_sha256": "<sha256 of the raw patch for exception paths only>"
  },
  "integrity": {
    "attestation_sha256": "<sha256 of this JSON canonical representation>",
    "evidence_bundle_path": "dist/evidence/<sha>/",
    "evidence_checksums_path": "checksums.sha256"
  }
}
```

## Canonicalization

To ensure deterministic hashing:
1.  Keys must be sorted alphabetically.
2.  No whitespace variability (e.g., no trailing whitespace, consistent indentation if pretty-printing, but preferably compact for hashing).
3.  Dates must be in UTC ISO8601 format (`YYYY-MM-DDTHH:MM:SSZ`).

## Verification

The attestation is signed using `cosign` keyless signing (OIDC). Verification requires checking the signature against the attestation JSON and ensuring the identity matches the repository and workflow.

```bash
cosign verify-blob \
  --certificate <attestation>.cert \
  --signature <attestation>.sig \
  --certificate-identity "https://github.com/intelgraph/intelgraph-platform/.github/workflows/governance-attestation.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  <attestation>.json
```
