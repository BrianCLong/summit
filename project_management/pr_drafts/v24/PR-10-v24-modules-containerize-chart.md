# PR 10 — v24 Modules: Containerize, Chart, and Dark‑Launch

Title: feat(v24): containerize & chart core v24 modules behind flags

Scope:

- v24_modules/activity_fingerprint_index, narrative_impact_model, trust_score_calculator, etc.

Files:

- Add Dockerfile per module, Helm charts (or subcharts), wiring to event bus, and feature flags default **off** in prod values.

Acceptance: stage deploy behind flags; 24‑hour soak; no SLO breach.

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
