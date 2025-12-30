# Witness Ledger

**Purpose:** Append-only ledger for witness chains across wedges.

**Responsibilities**

- Accept append requests with step commitments and signer identity.
- Hash-chain commitments for tamper evidence; expose session retrieval API.
- Store optional TEE quotes and determinism tokens.
