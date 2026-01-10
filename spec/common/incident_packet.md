# Incident Packet

## Purpose

Standardized DFARS-aligned incident reporting package with preservation evidence and reporting checklist.

## Required Fields

- Incident timeline
- Impacted asset identifiers
- CUI impact scope
- Forensic artifact manifest + hashes
- Reporting checklist
- Replay token binding to policy version

## Preservation Chain

- Hash each artifact
- Build hash chain manifest
- Store digest in transparency log

## Policy Gate

- Reporting window enforced (72 hours default).
- Preservation completion required before export.
