# IDCP Tool

CLI for indicator deconfliction with collision proofs.

## Usage
- `mc idcp deconflict --input indicators.json --proof-budget <count,time>`

## Outputs
- Deconfliction artifact containing canonical indicator, collision annotations, collision proof (Merkle root + support size), safe action envelope, replay token, optional attestation quote.
