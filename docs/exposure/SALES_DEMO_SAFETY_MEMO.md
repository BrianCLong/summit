# Sales & Demo Safety Memo

## What Summit Can Be Shown To Do (Demo-Safe)

- Present an **illustrative operational overview** (Command Center and Supply Chain dashboards).
- Walk through **investigations, alerts, and cases** in Sales Demo Mode.
- Provide **reports** and **support views** (Help, Changelog).

## What Summit Explicitly Does Not Claim in Demo Modes

- **No autonomy or authority**: the UI does not claim automatic decision-making.
- **No compliance guarantees**: no statements imply regulatory compliance, certification, or audit readiness.
- **No future-state promises**: forecasts, previews, and speculative analytics are suppressed.
- **No experimental features**: experiments are blocked outside Internal Mode.

## How the UI Prevents Overstatement

- **Exposure mode is mandatory** (`VITE_EXPOSURE_MODE`), with explicit production, sales demo, exec demo, and internal variants.
- **Route guards** prevent demo viewers from reaching non-approved surfaces.
- **Navigation filters** remove non-demo surfaces entirely.
- **Explicit banners** label demo modes as illustrative and non-operational.
- **Copy overrides** replace language that could imply real-time certainty or guarantees.

## Reminder

Truth beats persuasion. Guardrails beat training.
