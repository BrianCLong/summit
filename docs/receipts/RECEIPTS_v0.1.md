# Receipt Ledger v0.1

This document defines the schema and usage of the Switchboard Receipt Ledger.

## Overview

The Receipt Ledger provides a tamper-evident, append-only log of actions performed by the Switchboard agent. Each receipt is cryptographically linked to the previous one, forming a hash chain.

## Schema

The receipt schema is defined in `packages/receipts/src/schema/receipt.v0.1.json`.

### Fields

*   `id`: Unique identifier for the receipt (UUID).
*   `timestamp`: ISO 8601 timestamp of when the action occurred.
*   `actor`: The entity performing the action (e.g., `switchboard:agent`, `user:alice`).
*   `action`: The action performed (e.g., `skill:execute`, `policy:check`).
*   `payload`: JSON object containing action-specific data.
*   `hash`: SHA-256 hash of the receipt content (canonicalized).
*   `previous_hash`: Hash of the previous receipt in the chain (null for the first receipt).

## Determinism

Receipt hashes are calculated using CBOR canonical encoding of the receipt fields (excluding `hash`). This ensures that the same content always produces the same hash, regardless of key order in JSON.

## Evidence Bundle

Evidence bundles are exported as a collection of receipts (`report.json`), integrity metrics (`metrics.json`), and a timestamp (`stamp.json`).

### Export Format

*   `report.json`: Contains the array of receipts and the evidence ID.
*   `metrics.json`: Contains the count of receipts and a cumulative hash.
*   `stamp.json`: Contains the export timestamp and version.

## Usage

```typescript
import { Ledger } from '@summit/receipts';
import { exportBundle } from '@summit/export';

const ledger = new Ledger();
ledger.append({
  id: 'uuid-1',
  timestamp: new Date().toISOString(),
  actor: 'agent',
  action: 'init',
  payload: {}
});

const bundle = exportBundle(ledger, 'EVID-SWBD-20231027-test-1234567');
console.log(bundle);
```
