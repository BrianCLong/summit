# Shai-Hulud Supply-Chain Subsumption Standard

## Scope

This standard defines Summit's subsumption bundle for recent supply-chain attacks affecting npm and
PyPI. Controls focus on install-time execution risk, credential exfiltration persistence, and
hidden payload delivery through non-code assets.

## Claims Registry

- ITEM:CLAIM-01 — Install-time execution via npm lifecycle hooks.
- ITEM:CLAIM-03 — Automated propagation via compromised developer tokens.
- ITEM:CLAIM-04 — Hidden payload activation in PyPI typosquat packages.

## Required Controls

1. Deny-by-default lifecycle scripts (preinstall/postinstall/install/prepare).
2. Deterministic evidence bundle (report/metrics/stamp) with evidence ID mapping.
3. Docs and runbooks aligned to governance authority files.

## Evidence Mapping

- EVD-SUPPLYCHAIN-GOV-001: Subsumption bundle scaffold + docs.
- EVD-SUPPLYCHAIN-SEC-001: Lifecycle script gate (Deferred pending implementation).
- EVD-SUPPLYCHAIN-SEC-002: Asset payload heuristics (Deferred pending implementation).

## Determinism Rules

- Timestamps restricted to stamp.json only.
- Evidence index entries map to concrete artifact paths.
- Outputs are stable across runs.
