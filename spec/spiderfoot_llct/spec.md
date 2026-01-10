# SpiderFoot — LLCT: Linkage-Limited Correlation Tokens for OSINT

## Overview

LLCT enforces explicit correlation authority by requiring signed tokens that
scope which identifiers can be linked, for how long, and under what egress
constraints.

## Architecture

- **Token Issuer**: validates purpose and issues correlation tokens.
- **Execution Gate**: verifies token before module execution.
- **Link Enforcer**: blocks link creation beyond scope constraints.
- **Receipt Ledger**: logs linkage receipts with commitments.

## Data Contracts

- `correlation_token`
- `linkage_receipt`
- `selective_results` (redacted output set)

## Policy & Compliance

- Tokens are signed and bound to tenant and purpose.
- Receipts are hash-chained in the transparency log.
