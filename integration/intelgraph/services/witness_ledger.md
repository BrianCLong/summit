# Witness Ledger Service

## Purpose

Stores witness records in a tamper-evident chain.

## Responsibilities

- Append witness records with chain hashing.
- Provide verification endpoints for auditors.
- Enforce retention policies and access control.

## Interfaces

- `POST /v1/witness-ledger/records` to append records.
- `GET /v1/witness-ledger/records/{id}` to retrieve records.
