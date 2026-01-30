# Summit Module Map (Dynamic Intent)

This placeholder enumerates where dynamic intent components integrate into the Summit stack.

## Core Modules (To Be Confirmed)

- **UI Surface**: TODO — location of storyboard/clarification UI in the web client.
- **API Layer**: TODO — GraphQL/REST endpoints for storyboard ingestion and refinement ops.
- **Evidence Pipeline**: TODO — evidence ingestion, schema validation, and artifact registry.
- **Policy/Governance**: TODO — OPA policy locations enforcing deny-by-default behavior.
- **Storage**: TODO — persistence for storyboards, ambiguity reports, and intent memory.

## Temporary Check Names

- `ci/schema-validate`
- `ci/determinism`
- `ci/deny-by-default`
- `ci/deps-delta`
- `ci/locality-gate`

## Rename Plan

Once branch protection check names are confirmed, rename workflow check names to match production
requirements and update this map accordingly.
