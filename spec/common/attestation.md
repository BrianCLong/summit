# Optional Attestation

**Purpose:** Bind runtime measurements to evidence and witness chains using TEEs or trusted hardware.

**Components**

- Measurement of runtime binary/config hash.
- Quote signed by TEE, referencing evidence/witness digest.
- Verification policy describing acceptable measurements and freshness.

**Integration**

- Included in artifacts when available; consumers validate before trusting outputs.
- Quotes are logged in the witness ledger for audit and replay.
