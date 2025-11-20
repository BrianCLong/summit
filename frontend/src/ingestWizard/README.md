# Ingest wizard components

This directory contains a modular implementation of the Summit ingest wizard. The refactor breaks the flow into independent pieces that can be composed in feature screens or tested in isolation.

## Package layout

- `types.ts` — shared TypeScript interfaces for data source configuration, schema mapping, and validation output.
- `state.ts` — Redux-compatible slice that exposes actions/reducer for persisting wizard progress.
- `components/` — leaf UI components for each step (`DataSourceSelection`, `SchemaMappingStep`, `ValidationStep`).
- `IngestWizard.tsx` — orchestrator that wires the steps together using the exported reducer.
- `__stories__/` — Storybook stories for each component and the composed wizard.

## Usage

```tsx
import { IngestWizard, ingestWizardReducer, initialWizardState } from './ingestWizard';
import { configureStore } from '@reduxjs/toolkit';

const store = configureStore({
  reducer: {
    ingestWizard: ingestWizardReducer
  },
  preloadedState: {
    ingestWizard: initialWizardState
  }
});

<Provider store={store}>
  <IngestWizard onComplete={(result) => console.log(result)} />
</Provider>;
```

Each step component also accepts `value`/`onChange` props so they can be embedded into bespoke layouts or used in form builders without the full wizard container. Include `import './ingestWizard/styles.css';` in the screen where you compose the wizard to pick up the shared styling tokens.

## Validation

The wizard ships with a lightweight synchronous validator that mirrors the previous DPIA gating logic. For production connectors you can swap `performLocalValidation` with an async call and dispatch `setValidation` when the job completes.

## Storybook

Run `npm run storybook` from `frontend/` to launch the component catalog. Stories demonstrate default state, partially completed flows, and error handling.
