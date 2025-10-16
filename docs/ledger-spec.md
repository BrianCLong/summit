# Public Trust Ledger Spec (Phase 7)

## Purpose

Record all trust-relevant events (KPW issuance, attestation, revocation, contract upgrades, credential actions) in an immutable, append-only ledger openly queryable and verifiable.

## Event Schema

```json
{
  "eventId": "string (UUID)",
  "type": "ISSUE | REVOKE | CONTRACT_UPGRADE | ATTARSER_REVOCATION | ZONE_CHANGE",
  "timestamp": "ISO8601",
  "payload": {
    /* type-specific fields */
  },
  "prevHash": "hex",
  "merkleHash": "hex",
  "signature": "base64",
  "signer": "attester or foundation id"
}
```

### Chaining & Integrity

Each new event includes `prevHash` linking to previous event.

`merkleHash` is the hash of (`type`, `timestamp`, `payload`, `prevHash`).

`signature` signs the `merkleHash` with signer's private key.

### Queries & Proofs

Clients can request event ranges plus Merkle proofs for event inclusion.

Clients can build their own local copy of the ledger and validate.

### Anchoring / Cross-Reference

Periodically anchor ledger state to external blockchains (e.g. Ethereum, Bitcoin OP_RETURN) for tamper-resistance.

### Retention & Archival

Archive old segments but maintain Merkle proofs backward.

Snapshots can be compressed, but cryptographic continuity must stay.

### Versioning

Version field in header; support migrations and backwards compatibility.
