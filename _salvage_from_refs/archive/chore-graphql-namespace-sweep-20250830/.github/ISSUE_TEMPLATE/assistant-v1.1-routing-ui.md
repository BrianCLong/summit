---
name: Assistant v1.1 — Routing UI / Policy
about: Track per-tenant model routing (UI, policy, dry-run, audit, revert)
title: "Assistant v1.1: Routing UI / Policy"
labels: ["release: v1.1", "theme: routing", "area: admin", "area: server"]
milestone: "Assistant v1.1"
---

## Scope
- UI + policy to choose model tier/transport/safety; audited changes, dry-run diffs.

## Checklist
- [ ] Policy schema defined (tier, transport, safety, constraints)
- [ ] Admin Console panel (view/edit policy per tenant)
- [ ] Dry‑run validator (diff-from-current; highlights misroutes)
- [ ] Apply + audit trail (who/when/what; revert)
- [ ] Server enforcement + logs (decision → model/transport)
- [ ] Tests: unit + integration (mocked), WITH_SERVICES nightly
- [ ] Docs: admin guide + examples

## Acceptance
- [ ] Changes audited and reversible; dry-run required before apply
- [ ] Routing decisions visible in logs/metrics (dashboard)

