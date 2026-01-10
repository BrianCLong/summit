# Extension Model

## Purpose

This document defines what counts as an extension, the GA boundary, trust limits, and compatibility expectations for all Summit extensions. It is governed by the Summit Readiness Assertion and the GA baseline authority sources.

## Authority

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/releases/MVP-4_GA_BASELINE.md`
- `docs/releases/GA-CORE-RELEASE-NOTES.md`
- `docs/release/GA_EVIDENCE_INDEX.md`
- `docs/security/SECURITY_REMEDIATION_LEDGER.md`

## What Counts as an Extension

An extension is any artifact that changes Summit behavior or outputs without modifying the core repository code. Extensions include:

- Plugins, add-ons, or adapters that execute within Summit runtime boundaries.
- External scripts or automation that call Summit APIs or operate on Summit data.
- Integrations or connectors that move data into or out of Summit.
- Forks or downstream builds that modify distribution or operational defaults.

## GA Boundary: In-Scope vs Out-of-Scope

**In-scope for GA boundary enforcement**

- Extensions that run within Summit runtime boundaries.
- Extensions that interact with GA-certified APIs, data flows, or governance controls.
- Extensions that touch identity, access control, provenance, or export paths.

**Out-of-scope for GA certification**

- Extensions that are not explicitly named in GA authority files.
- Forks that change build, policy, or evidence controls.

Extensions outside the GA scope may exist, but they are not GA-certified and are not represented as GA capabilities.

## Trust Boundaries (Non-Negotiable)

Extensions must not:

- Bypass policy-as-code enforcement or identity checks.
- Modify or suppress provenance, audit, or evidence outputs.
- Alter the Golden Path verification flow.
- Introduce hidden data egress, export channels, or shadow storage.
- Downgrade security controls that are enforced in GA authority files.

Any deviation is a **Governed Exception** and must be recorded with evidence in the extension review checklist.

## Compatibility Expectations

- Extensions must declare the Summit version range they support.
- Extensions must honor GA authority definitions for policy, provenance, and evidence.
- Extensions must maintain deterministic behavior for invalid input in line with the GA baseline.

## Extension Authority Hierarchy

1. `docs/SUMMIT_READINESS_ASSERTION.md`
2. `docs/releases/MVP-4_GA_BASELINE.md`
3. `docs/releases/GA-CORE-RELEASE-NOTES.md`
4. `docs/release/GA_EVIDENCE_INDEX.md`
5. `docs/security/SECURITY_REMEDIATION_LEDGER.md`
6. Extension-specific documentation and evidence bundles
