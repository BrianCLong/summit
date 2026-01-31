Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Epic 4 — Error Handling & Recoverability (no stuck states, no mystery failures)

1.  Define error taxonomy and codes (client-safe, actionable, searchable).
2.  Standardize retry semantics across clients/services (bounded, jittered, safe).
3.  Implement “undo” or compensations for top user mistakes in Tier-0 flows.
4.  Add resumable UX for long operations (jobs + status + retry).
5.  Create “why can’t I?” permission diagnostics everywhere it matters.
6.  Build customer-facing troubleshooting panels for common failure modes.
7.  Add server-side “repair endpoints” for support (scoped, audited, JIT access).
8.  Implement dead-letter queues + replay tooling for async pipelines.
9.  Add automated detection for stuck workflows and self-heal where possible.
10. Require runbooks linked from every high-sev alert and error code.
11. Delete generic “Something went wrong” messages.
