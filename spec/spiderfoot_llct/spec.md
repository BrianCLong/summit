# SpiderFoot — LLCT: Linkage-Limited Correlation Tokens for OSINT

## Overview
LLCT introduces scoped correlation tokens to constrain cross-identifier linking in OSINT workflows, limiting correlation radius, TTL, and egress while producing audit-ready linkage receipts.

## Architecture
- **Token Authority**: issues and validates linkage-limited correlation tokens with scopes (identifier types, hop counts, TTL, egress limits, jurisdiction).
- **Module Executor**: runs OSINT modules and routes outputs through enforcement layer.
- **Enforcement Layer**: blocks link creation outside token scope, redacts disallowed identifiers, enforces hop and egress budgets.
- **Receipt Generator**: commits linked identifiers and token metadata into linkage receipts (hash-chained ledger) with replay tokens and optional attestation quotes.
- **Transparency & Cache**: caches validated tokens by TTL; logs receipts to transparency log.

## Data Contracts
- **Token**: scope fields, signature binding tenant and purpose, replay token (module versions, time window).
- **Linkage receipt**: linked identifiers, token hash, hash-chain pointer, attestation quote?, jurisdiction decision, egress usage, replay token.
