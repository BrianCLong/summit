# Annotation & Active Learning Studio (Prompt #67)

- **Feature flag:** `AALS_ENABLED` (default: false)
- **Features:** labels/spans/relations, keyboard-first; suggestions after agreement ≥0.6 kappa or ≥70%
- **Backend:** `/ai/active-learning` (Python+Celery) for sampling + lightweight models; emits `label.model.updated`
- **Constraints:** no PII leaves tenant; versioned labels with rollback
- **Tests:** agreement stats, Playwright label→train→suggest, precision/recall fixtures
