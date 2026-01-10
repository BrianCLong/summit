---
title: Docs Data Governance
summary: Retention and deletion policies for docs artifacts and telemetry.
owner: privacy
---

- Access logs: 90 days
- Telemetry (TTA): 180 days anonymized
- Audit artifacts (builds): 1 year
- Deletion pipeline: quarterly purge job

---
## GA Artifact Governance

*   **Post-Release Guardrails (MVP-4 GA):** As of commit `3bdd8370e1c1cc6137220065fc627f8c66429d4a`, all artifacts referenced in the `MVP4_RELEASE_ARCHIVE.md` are considered frozen. Development guardrails, including PR checklists and explicit acknowledgments for changes to GA-related documents, are confirmed to be active to prevent silent drift.
