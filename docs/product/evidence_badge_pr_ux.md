# Evidence Badge PR UX

## Placement
- Single update-in-place PR comment
- Optional README badge for main branch

## Comment Content
- Badge image (Shields endpoint)
- Link to public evidence summary
- Link to private evidence packet (internal only)

## Reviewer Checklist
- Badge shows **verified** for SBOM attestation
- Evidence summary includes commit SHA
- No private URLs or secrets in public payloads

## Demo Script
1. Open PR with invalid attestation → badge shows **failed**.
2. Fix attestation verification → badge updates to **verified** in the same comment.
