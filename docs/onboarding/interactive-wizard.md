# Summit Interactive Onboarding Wizard

The onboarding wizard gives new Summit users a guided setup to connect data sources, model entities, create queries, and share dashboards. Progress is persisted through the Summit GraphQL API and stored in PostgreSQL so teams can pause and resume onboarding without losing state.

## Feature Overview

- **Redux-managed state** keeps the wizard responsive and synchronised across components.
- **GraphQL-backed persistence** guarantees step completion and form data is stored in the `onboarding_progress` table.
- **Material UI stepper experience** walks users through each milestone with contextual helper text.
- **Playwright E2E coverage** verifies that core interactions (saving and completing steps) work end-to-end.

### Default Steps

1. **Connect Data Sources** – configure connectors and ingestion cadence.
2. **Model Entities & Relationships** – align incoming fields with graph entities.
3. **Create Your First Query** – validate the data pipeline with a saved query.
4. **Share Insights** – prepare downstream delivery channels for insights.

Each step provides structured inputs and helper text. The wizard exposes data-testid hooks for testing and automation: `onboarding-wizard`, `field-<step>-<field>`, `complete-step-<step>`, etc.

## GraphQL Contract

The wizard integrates with the following mutations and queries:

```graphql
query OnboardingProgress($userId: ID!) { ... }
mutation UpsertOnboardingStep($input: OnboardingStepInput!) { ... }
mutation ResetOnboardingProgress($userId: ID!) { ... }
```

Schema types are defined in `server/src/graphql/schema/onboarding.ts`. Resolvers live in `server/src/graphql/resolvers/onboarding.ts` and delegate to the `OnboardingProgressRepo` which handles PostgreSQL persistence with an in-memory fallback for local development.

## Database Schema

A migration (`016_onboarding_progress.sql`) creates the `onboarding_progress` table with indexes for user and step lookups plus a trigger that keeps `updated_at` fresh. Insert/upsert logic ensures that completing a step records timestamps while edits remain idempotent.

## Testing Strategy

- **Playwright E2E** – `client/tests/e2e/onboarding-wizard.spec.ts` validates saving and completing the first step survives a reload.
- **Redux slice** – `client/src/store/slices/onboardingSlice.ts` manages loading state, hydration, and resets.

To run the Playwright test locally:

```bash
cd client
npm run test:e2e -- onboarding-wizard.spec.ts
```

The wizard is accessible via the **Onboarding** navigation item at `/onboarding` once the Summit client is running (`npm run dev`).
