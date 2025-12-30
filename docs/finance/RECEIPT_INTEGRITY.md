# Receipt Integrity

This document describes the mechanism for ensuring the integrity of financial receipts within the system.

## Overview

To prevent tampering and ensure consistency across distributed systems, all receipts are assigned a deterministic SHA-256 hash. This hash is derived from a canonical JSON representation of the receipt data.

## Canonicalization Rules

The canonicalization process ensures that semantically identical receipts produce the exact same string representation, regardless of:
- Key ordering in JSON objects.
- Non-semantic whitespace in strings (leading/trailing whitespace is trimmed).
- Formatting of numbers (standard JSON serialization is used).

### Specifics:
1.  **Object Keys**: Sorted lexicographically.
2.  **Strings**: Trimmed of leading and trailing whitespace.
3.  **Arrays**: Order is preserved (lists are ordered sequences).
4.  **Primitives**:
    - Numbers: Serialized as per `JSON.stringify`.
    - Booleans: `true` or `false`.
    - Null: `null`.
5.  **Dates**: Converted to ISO strings.

## Hashing

The canonical string is hashed using **SHA-256**.

`receipt_hash = SHA256(canonicalize(receipt))`

## Implementation

- **Canonicalization**: `server/src/receipts/canonicalize.ts`
- **Hashing**: `server/src/receipts/hash.ts`

## Feature Flag

Integrity checks are controlled by the `RECEIPT_HASH_ENABLED` feature flag (default: `false`).

## Usage

```typescript
import { calculateReceiptHash } from 'server/src/receipts/hash';

const receipt = { ... };
const hash = calculateReceiptHash(receipt);
```
