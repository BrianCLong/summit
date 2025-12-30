# IPIO Tool

CLI wrapper for invoking IPIO origin certificate computation.

## Usage
- `mc ipio compute --window <start,end> --events events.json --budget <edges,runtime>`

## Outputs
- Origin certificate JSON with origin set, uncertainty, explanation subgraph ref, replay token, Merkle root, attestation quote (optional).
