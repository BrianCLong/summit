# Cross-Chain Bridge for KPW / Trust Metadata

## Goal

Anchor trust-critical state (e.g. KPW manifest hashes, attestation summaries, revocation roots) on immutable public blockchains and interoperate with identity systems (DID, VC).

## Components

1.  **Bridge Anchor Transactions**
    - Periodic transactions embedding succinct snapshots (e.g. root merkleHash) into blockchain.

2.  **On-chain Verifier Contracts**
    - Smart contracts that accept proofs, validate signatures, and emit events (e.g. revocation).

3.  **Off-chain Verifier Modules**
    - Clients verify local proof + check inclusion in blockchain anchor.

4.  **Identity Bridge for DID / VC**
    - Map KPW signer identities to DIDs, issue Verifiable Credentials certified by trust foundation.

## Format

- Anchor payload includes: `ledgerRoot`, `blockchainTxId`, `timestamp`, `foundationSig`
- Smart contract stores events: `AttesterRevoked`, `CredentialBound`

## Security

- Use known blockchains for anchoring (Ethereum, Cosmos)
- Use multi-sig / threshold signatures for anchor submission
- Bridge nodes must validate local ledger state against block anchor
