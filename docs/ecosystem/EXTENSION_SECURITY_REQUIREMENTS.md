# Extension Security Requirements

## Purpose

This document defines the minimum security requirements for Summit extensions. These requirements align to GA baseline security and must be met before an extension is approved or endorsed.

## Authority

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/releases/MVP-4_GA_BASELINE.md`
- `docs/releases/GA-CORE-RELEASE-NOTES.md`
- `docs/release/GA_EVIDENCE_INDEX.md`
- `docs/security/SECURITY_REMEDIATION_LEDGER.md`

## Dependency Hygiene

- Maintain a complete dependency inventory with versions and licenses.
- Block high-severity vulnerabilities prior to release.
- Use deterministic lockfiles and reproducible build steps.

## Secret Handling

- Secrets are injected through approved runtime configuration only.
- No secrets in source code, logs, or artifacts.
- Rotation and revocation procedures must be documented in extension operations notes.

## Logging and Data Boundaries

- Log events must avoid PII exposure and follow Summit audit conventions.
- Data access must respect policy-as-code decisions and authority bindings.
- Extensions must not persist Summit data outside approved storage paths.

## Verification Expectations

- Provide unit-level verification for extension logic.
- Provide integration verification that demonstrates policy enforcement and provenance integrity.
- Provide evidence references mapped to `docs/release/GA_EVIDENCE_INDEX.md`.
- Capture security review outcomes in the extension review checklist.

## Governed Exceptions

Any deviation from these requirements is a **Governed Exception** and requires explicit approval with evidence.
