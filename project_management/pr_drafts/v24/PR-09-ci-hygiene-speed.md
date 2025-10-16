# PR 9 — CI Hygiene & Speed (Reusable Actions & Caching)

Title: refactor(ci): consolidate workflows; add concurrency & caches; affected‑paths tests

Files:

- Modify multiple under `.github/workflows/*.yml` to use composite actions, set `concurrency:`, add pnpm/pip caches, and run tests only for affected paths.

Acceptance: CI wall‑clock reduced ≥25%; flake <1%.

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
