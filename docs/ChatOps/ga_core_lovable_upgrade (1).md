# 🌟 GA Core → Most Lovable (Yet Fearsome) Product (MLFP) Upgrade Collateral

This collateral provides everything needed to update backlog, documentation, and dev planning for the **GA Core expansion** into a **Most Lovable Yet Fearsome Product (MLFP)**. Paste this into the repo for alignment.

---

## 1. 📜 Executive Summary

We are **expanding GA Core** beyond baseline (A–D + F) to include subsets of E, G, H, and I that ensure adoption, usability, and analyst delight—**but with an edge of fearsome rigor.** The re-scoped GA Core is now a **MLFP**, designed to be irresistible to use, yet commanding respect through uncompromising governance and power.

**New GA Core = A–D + F + (E subset ++, G subset ++, H subset ++, I subset ++)**

---

## 2. 🗂️ Backlog (Epics → Stories → Priority → Sprint)

```yaml
backlog:
  - epic: Collaboration (E)
    stories:
      - story: Case spaces with immutable audit + SLA timers
        priority: P0 - Must
        sprint: Sprint 1
      - story: Comment threads bound to graph nodes
        priority: P0 - Must
        sprint: Sprint 1
      - story: Live co-editing of link charts
        priority: P1 - Love
        sprint: Sprint 2
      - story: @Mentions with inline entity previews
        priority: P1 - Love
        sprint: Sprint 2

  - epic: Integrations (G)
    stories:
      - story: STIX/TAXII + MISP bi-directional connectors
        priority: P0 - Must
        sprint: Sprint 1
      - story: Slack/Teams + Jira/ServiceNow integration
        priority: P0 - Must
        sprint: Sprint 1
      - story: Push graph updates into chat with visual snippets
        priority: P1 - Love
        sprint: Sprint 2
      - story: Magic paste (auto-entity creation from raw text/CSV/URL)
        priority: P2 - Delight
        sprint: Sprint 3

  - epic: Ops & Reliability (H)
    stories:
      - story: Metrics/Prometheus + DR/BCP baseline
        priority: P0 - Must
        sprint: Sprint 1
      - story: Smart query budgeter with optimization hints
        priority: P1 - Love
        sprint: Sprint 2
      - story: Predictive latency heatmaps
        priority: P2 - Fearsome Delight
        sprint: Sprint 3

  - epic: Frontend Experience (I)
    stories:
      - story: Tri-pane Timeline + Map + Graph view
        priority: P0 - Must
        sprint: Sprint 1
      - story: Undo/Redo + Explain-this-view panel
        priority: P0 - Must
        sprint: Sprint 1
      - story: Drag-and-drop narrative builder
        priority: P1 - Love
        sprint: Sprint 2
      - story: Beautiful graph expansion animations
        priority: P2 - Delight
        sprint: Sprint 3
      - story: UI clutter dimming for focus (cognitive load guardrails)
        priority: P2 - Fearsome Delight
        sprint: Sprint 3
```

---

## 3. 🔗 Dependency Mapping

- **E.P1 (co-editing, mentions)** depends on E.P0 (case spaces, comments).
- **G.P1 (chat push)** depends on G.P0 (integrations baseline).
- **G.P2 (magic paste)** depends on core ingestion A.
- **H.P1 (smart query budgeter)** depends on H.P0 (metrics baseline).
- **H.P2 (latency heatmaps)** depends on H.P0 (metrics baseline).
- **I.P1 (narrative builder)** depends on I.P0 (tri-pane, undo/redo).
- **I.P2 (animations, clutter dimming)** can be layered anytime after I.P0.

---

## 4. 📊 Phased Rollout Plan

**Sprint 1 (Foundational Musts)**

- Case spaces + audit + comments
- STIX/TAXII + MISP connectors
- Slack/Teams + Jira/ServiceNow integrations
- Metrics/Prometheus + DR/BCP
- Tri-pane + Undo/Redo + Explain panel

**Sprint 2 (Love Features)**

- Live co-editing + @mentions with previews
- Push updates to chat with graph snippets
- Smart query budgeter (with hints)
- Drag-and-drop narrative builder

**Sprint 3 (Delight + Fearsome Edge)**

- Magic paste (auto-ingest from snippets)
- Predictive latency heatmaps (fearsome analytics power)
- Graph expansion animations
- UI clutter dimming (fearsome focus mode)

---

## 5. ✅ Acceptance Criteria Patterns

- **Fearsome audit:** all actions logged with tamper alarms.
- **Co-editing:** two analysts editing same chart see changes within 1s; audit shows authorship.
- **Entity previews:** hover preview loads in <200ms with provenance visible.
- **Slack/Jira integrations:** actions from graph reflect in chat/tickets with entity link.
- **Metrics baseline:** default Prometheus /metrics endpoint exposes ingestion, query latency, auth events.
- **Tri-pane UX:** synchronized brushing between timeline, map, and graph.

---

## 6. 🎨 UX Principles

- Analysts must feel joy → animations, previews, cognitive guardrails.
- Analysts must also feel awe → predictive analytics, uncompromising audits, and focus modes that enforce discipline.
- Balance **love (delightful features)** with **fear (respect for governance & rigor).**

---

## 7. ⚖️ Ethics & Governance Reminder

- Auditability and provenance remain **iron law**—to instill fear of misuse.
- No covert exploitation or unlawful surveillance features.
- “Delight” is balanced by **fearsome compliance and accountability.**

---

## 8. 📌 Next Actions

- Update repo backlog YAML with above.
- Create epic/issue tickets per story.
- Tag Sprint 1 Musts as **GA Core Lock Criteria.**
- Add Sprint 2–3 to roadmap as committed post-GA releases.

---

**End of Collateral — Now both Lovable _and_ Fearsome, in true Machiavellian balance.**
