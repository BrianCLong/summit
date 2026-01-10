# Transparency Log Service

## Purpose

Provides an append-only log for capsule commitments and replay metadata.

## Responsibilities

- Append signed log entries for capsule creation.
- Provide read-only queries for audit verification.
- Reject modifications or deletions.

## Interfaces

- `POST /v1/transparency-log/entries` to append entries.
- `GET /v1/transparency-log/entries/{id}` to retrieve entries.
