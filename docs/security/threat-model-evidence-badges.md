# Threat Model: Evidence Badges

## MAESTRO Alignment
- **MAESTRO Layers**: Foundation, Data, Tools, Infra, Observability, Security
- **Threats Considered**:
  - Badge payload tampering on public endpoints
  - Attestation spoofing or replay
  - Leakage of internal URLs or identifiers
  - Workflow action pinning drift
  - Prompt/tool misuse in CI steps
- **Mitigations**:
  - SHA-pinned actions and pinning gate
  - OIDC-only signing + cosign verification
  - Public redaction policy enforced via OPA gate
  - Deterministic payloads with evidence summary hashes
  - Evidence artifacts stored privately with audit trails

## Attack Surface
- Public badge endpoints
- Workflow artifact storage
- CI verification steps

## Controls
- `ci/gates/actions_sha_pinned.sh`
- `ci/gates/attestation_verification_required.sh`
- `ci/gates/public_evidence_redaction_pass.sh`

## Observability
- Badge publish logs
- Verification status in `evidence.summary.json`
