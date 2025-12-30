# Scope Tokens

Defines scoped classification tokens for coalition and DoD releasability.

- **Token binding:** tenant, purpose, classification scope (CUI, NATO Restricted, internal), TTL, issuing authority.
- **Cryptographic structure:** signed JWT-like envelope with Merkle-root commitment to policy revision, schema version, and issuing KMS key.
- **Enforcement hooks:** network egress allowlists, disclosure budget, module execution class (passive/active), attestation requirement flag.
- **Audit fields:** issuance time, expiry, justification, replay token, transparency log digest.
- **Interoperability:** markings align to DoD/DFARS CUI handling and NATO C-M(2002)49 releasability categories.

**Usage**: supplied to runtime guards (see `/integration/mc/guardrails/scope_enforcer.md`) and referenced by egress receipts and releasability packs.
