# Prov-Ledger GA — Verifiable Evidence & Claim Manifests

## Scope

- Service: services/prov-ledger (TS)
- CLI: tools/prov/ig-prov-verify
- Contracts: Claim, Evidence, Manifest; events: EvidenceRegistered, ClaimContradiction, ManifestSealed

## Acceptance Criteria

- Generate/verify manifest with Merkle root; offline verifier passes
- Export bundle includes license tags and transform lineage per field
- Jest ≥90% stmt; Playwright export+verify green; SBOM present

## Test Plan

- `npm test -w services/prov-ledger`
- `npm run e2e -w apps/web/report-studio`
- Golden fixtures in `/fixtures/prov-ledger/*`

## Security/Privacy

- Signed manifests; tamper detection; license compliance

## Migration/Docs

- DB migrations versioned; README with verifier quickstart
