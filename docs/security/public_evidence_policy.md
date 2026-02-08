# Public Evidence Policy

## Scope
This policy governs any public evidence payloads published for Evidence Badges.

## Public-Safe Fields
Only the following fields are permitted in public payloads:

- `badge.json`: schemaVersion, label, message, color, labelColor, style, logo, logoColor, namedLogo, cacheSeconds
- `evidence.summary.json`: schemaVersion, commit, sbom, attestation, verification

## Denylist
Public payloads MUST NOT include:

- Internal URLs (`github.com/<org>/<repo>/actions`, `localhost`, RFC1918 endpoints)
- Secrets, tokens, or credentials
- SBOM contents or vulnerability details

## Enforcement
- `policies/public_evidence_redaction.rego`
- `ci/gates/public_evidence_redaction_pass.sh`

## Governed Exceptions
Any policy bypass is a governed exception requiring approval and documentation.
