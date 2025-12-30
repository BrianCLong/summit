# Transparency Log Service

## Purpose

Anchor commitments from all wedges in a tamper-evident chain with inclusion proofs.

## Features

- Hash-chained entries with previous hash and signature.
- Sparse Merkle index for per-tenant or per-product queries.
- Export filters to apply disclosure constraints before external audit sharing.

## Endpoints

- `POST /log/entries`: append commitment with entry metadata.
- `GET /log/entries`: query by entry type, time window, tenant.
- `GET /log/proof/{id}`: retrieve inclusion proof for ledger entries.
