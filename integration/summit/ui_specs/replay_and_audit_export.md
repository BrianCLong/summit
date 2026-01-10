# Replay & Audit Export UI

## Purpose

Provide replay controls and audit-grade exports for artifacts.

## Core Elements

- Determinism token and snapshot identifiers.
- Replay parameters (time window, seed, index version).
- Audit export bundle (evidence + witness + policy decisions).

## Actions

- Trigger replay job and display diff vs. original.
- Export audit package (signed JSON + manifest).
- Record export action in witness ledger.
