# OSINT Governance (Human-Steered, Deny-by-Default)

This document defines governance controls for Summit OSINT automation. All OSINT execution is
human-steered, scope-limited, and evidence-backed, aligned with the Summit Readiness Assertion
(`docs/SUMMIT_READINESS_ASSERTION.md`).

## Core Principles

- **Human-defined scope only:** Playbooks define inputs, sources, and stop conditions.
- **Public collection only:** Collectors must document ToS notes and rate-limit controls.
- **Deny-by-default:** Network access is blocked unless explicitly enabled by policy and env flags.
- **Provenance required:** Every finding must include source, collector, request ID, and timestamp.
- **Verification required:** Claims must declare verification status and corroboration evidence.

## Required Controls

1. **Policy Required**
   - `policies.tosNote` is mandatory in every playbook.
   - `policies.piiHandling` must be declared.
   - `stop` conditions must be present.

2. **Execution Guards**
   - `OSINT_ENABLED=false` prevents OSINT runs.
   - `OSINT_ALLOW_NETWORK=false` prevents network collectors.
   - Collectors must enforce allowlisted sources only.

3. **Evidence & Artifacts**
   - Artifacts must include `report.json`, `metrics.json`, `stamp.json`, and `evidence/index.json`.
   - Evidence IDs follow `EVD-OSINT-<AREA>-<NNN>`.

4. **Data Handling**
   - Minimize PII collection; store only what is necessary.
   - Retention follows playbook TTL policy.
   - Never log raw page bodies or credentials.

## Compliance Alignment

- **Scope creep prevention:** playbook allowlists + stop conditions.
- **ToS/legal compliance:** per-source ToS notes + rate limits.
- **Anti-hallucination:** verification status and corroboration checks.
- **Supply-chain hygiene:** dependency deltas documented when lockfiles change.
