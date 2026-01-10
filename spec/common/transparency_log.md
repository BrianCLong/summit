# Transparency Log

## Purpose

Append-only log that stores digests of evidence packs, incident packets, and egress receipts for audit integrity.

## Required Fields

- Entry ID
- Manifest hash
- Scope token ID
- Timestamp
- Policy bundle version

## Retention

- Retained for audit duration specified in compliance requirements.
- Hash chain ensures tamper evidence.
