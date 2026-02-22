# Cognitive Warfare (Defensive-Only) Overview

**Scope:** Defensive-only detection, attribution, warning, and resilience hardening.
**Out of Scope:** Persuasion optimization, microtargeting, or influence automation.

## Purpose

This package establishes a minimal, governed baseline for cognitive-warfare indicators & warnings
(I&W) and provenance integrity. It is aligned to NATO public S&T framing on technology enablers,
indicators/warnings, and meaningful human control. It does **not** automate influence operations.

## Evidence & Governance

- Evidence IDs are required for each defensive capability family and must map to deterministic
  artifacts in `evidence/`.
- Policy gates enforce deny-by-default controls for offensive requests.
- Feature flags default OFF and require explicit enablement.

## References

- Summit readiness assertion: `docs/SUMMIT_READINESS_ASSERTION.md`.
- Governance anchors: `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`.
