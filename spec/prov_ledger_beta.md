# Provenance & Claim Ledger Beta Spec

## Manifest Structure
- Root hash tree covering source acquisition, transforms, model/tool invocations, and exports.
- Each node carries: `id`, `parent`, `op_type`, `inputs`, `outputs`, `timestamp`, `actor`, `policy_decision`, `signatures`.
- Transform chain encodes licensing/TOS, dataset sensitivity, and cost budget applied.
- Export manifest bundles: claim ledger reference, authority binding, audit correlation IDs, and checksum of payload.

## Ledger Behavior
- Append-only log with periodic checkpoints; supports verification against manifest hash tree.
- Writes on ingest, enrichment, query result materialization, and export packaging.
- Multi-signer support (system + reviewer) for sensitive exports.

## Verifier CLI Outline
- Commands: `verify <manifest>`, `inspect <node-id>`, `checkpoint --list`, `diff --baseline <manifestA> --target <manifestB>`.
- Outputs: pass/fail status, tamper locations, policy decisions, and missing signatures.
- Exit codes: 0 pass, 1 verification failure, 2 malformed input.
- Integration: runnable in CI and referenced by export pipelines.

## Testing
- Golden fixtures for tampered vs intact manifests.
- Hash-chain replay ensuring immutability.
- Performance: verify 10k-node manifest in <2s on dev hardware.
