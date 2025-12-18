# Maestro Run Console

The Maestro Run Console is the primary UI slice for observing end-to-end runs.

## What it does

- Accepts a free-form request from the user.
- Invokes the Maestro backend pipeline (`POST /api/maestro/runs`).
- Displays:
  - Run metadata (ID, user, timestamp).
  - Planned and executed tasks with status badges.
  - Per-task output artifacts.
  - Token usage and estimated cost by model.

## How to use

1. Open `/maestro-run-console` in the web app.
2. Enter a request that describes the desired workflow.
3. Click **Run with Maestro**.
4. Watch tasks and outputs populate as the run completes.

## Implementation

- Frontend:
  - `src/components/MaestroRunConsole.tsx`
  - `src/hooks/useMaestroRun.ts`
  - `src/lib/api/maestro.ts`
  - `src/types/maestro.ts`

- Backend:
  - `POST /api/maestro/runs` → `Maestro.runPipeline()`
  - IntelGraph + CostMeter provide task and cost data.
