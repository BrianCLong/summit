# OMCP Tool

CLI for compiling ontology migrations with compatibility proofs.

## Usage
- `mc omcp compile --prior prior_schema.json --updated updated_schema.json --shadow`

## Outputs
- Migration artifact with migration plan, compatibility shim, compatibility proof or breakage certificate, witness chain, replay token, optional attestation quote.
