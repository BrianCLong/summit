# Guided Tours Overview

Summit's UI now includes accessible guided tours for major onboarding surfaces. Tours are powered by [React Joyride](https://github.com/gilbarbara/react-joyride), persisted through GraphQL, and recorded in PostgreSQL so completion state survives across sessions.

## Feature coverage

| Tour key | Experience | Entry point |
| --- | --- | --- |
| `ingest-wizard` | IntelGraph ingest wizard walkthrough | Dashboard → **Launch ingest wizard** |
| `query-builder` | Search query chip builder | Dashboard → **Query Builder Playground** |

The `FeatureTourProvider` exposes `startTour`, `resetTour`, and live `progress` so any feature can enable contextual onboarding.

## Architecture

### Client

- **Provider:** `src/features/onboarding/FeatureTourProvider.tsx` wraps the authenticated app shell and manages Joyride sessions, optimistic Apollo updates, and accessibility defaults.
- **Tour definitions:** `src/features/onboarding/tourSteps.tsx` centralizes step metadata, including selectors and copy tuned for WCAG 2.1 AA.
- **Components:**
  - Ingest wizard (`src/components/onboarding/GoldenPathWizard.jsx`) exposes a “Guided tour” control, announces progress, and maps each step to a stable `data-tour-id`.
  - Query builder (`src/components/search/QueryChipBuilder.tsx`) adds a replayable tour toggle, keyboard-friendly selectors, and polite status updates.

### GraphQL + persistence

- **Schema:** `FeatureTourProgress` types live in `server/src/graphql/schema/featureTours.ts` and extend the core schema with `featureTourProgresses` query plus `recordFeatureTourProgress` mutation.
- **Resolvers:** `server/src/graphql/resolvers/featureTours.ts` enforce authentication, upsert completion status via PostgreSQL, and expose `completed`, `completedAt`, and `lastStep` metadata.
- **Database:** Migration `server/db/migrations/postgres/2025-09-30_feature_tour_progress.sql` creates the `feature_tour_progress` table, unique (user_id, tour_key) index, and touch-up trigger for `updated_at`.

### Accessibility highlights

- Joyride tooltips include semantic headings, consistent button labels, and polite `aria-live` updates for progress copy.
- Primary tour controls supply `aria-label`s, preserve keyboard focus, and avoid color-only cues.
- Ingest wizard progress bars expose `aria-label="Wizard progress"`; query builder status lines use `role="status"` for screen reader announcements.

## GraphQL usage

```
query FeatureTourProgresses {
  featureTourProgresses {
    id
    tourKey
    completed
    completedAt
    lastStep
  }
}

mutation RecordFeatureTourProgress($input: FeatureTourProgressInput!) {
  recordFeatureTourProgress(input: $input) {
    id
    tourKey
    completed
    completedAt
    lastStep
  }
}
```

Clients should call `startTour` with the appropriate key. The provider automatically records intermediate progress and marks tours complete when Joyride emits a `FINISHED` event. Use `resetTour(key)` to clear state and replay a tour.

## Testing

Playwright coverage lives at `client/tests/e2e/guided-tours.spec.ts` and exercises both tours end-to-end (login, start, advance through steps, and assert completion messaging).

Run the suite after installing dependencies:

```
cd client
npm install
npm run test:e2e guided-tours.spec.ts
```

## Adding a new tour

1. Define selectors in the target component (prefer `data-tour-id` attributes).
2. Append step metadata to `tourSteps.tsx` with accessible copy and deterministic targets.
3. Consume the `FeatureTourProvider` hook where the tour starts and expose a launch button with `aria-label` and replay affordances.
4. Persist progress by invoking `startTour(tourKey, steps)` and optionally `resetTour(tourKey)` before replays.
5. Extend `feature_tour_progress` seed data or migrations if new defaults are needed.
6. Add Playwright coverage under `client/tests/e2e` that confirms the tooltip flow and status updates.

Following this pattern keeps onboarding stateful, accessible, and auditable.
