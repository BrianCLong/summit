# Onboarding

This document describes how to get started with the IntelGraph platform.

## Interactive Tutorials

Summit now includes interactive, Intro.js-powered walkthroughs to help new analysts master the core workflows without leaving the application. Tutorials launch automatically the first time a feature is opened and remain available inside the global **Help & Documentation** panel.

### Available tutorials

- **Data Ingest Wizard Tour** – Automatically opens on first sign-in to guide users through configuring a new investigation, loading data, and kicking off Copilot analysis. The tour highlights progress tracking, demo mode, and contextual help within the wizard.
- **Graph Querying Tour** – Accessible from the Help panel or when navigating to the Graph Explorer. The tutorial demonstrates how to craft natural-language questions, leverage quick actions, and interpret returned graph insights.

### How completion works

- Tutorial progress is persisted per-user in PostgreSQL via the GraphQL API, so guides only auto-run until they are completed or manually reset.
- Analysts can replay or reset any tutorial from the Help panel; restarting also clears the local session reminders to ensure the guided tour relaunches immediately.
- Help panel controls route users to the relevant screen before starting the selected tour, ensuring UI elements referenced by the steps are present.

Refer to the Help panel at any time to revisit these interactive experiences or to launch additional documentation.
