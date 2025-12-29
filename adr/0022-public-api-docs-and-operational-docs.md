# 0022 - Public API Documentation Site and Operational Documentation Coverage

- Status: Proposed
- Date: 2025-12-29
- Area: API, Observability, DX
- Tags: api-docs, developer-experience, documentation, troubleshooting

## Context

The platform exposes multiple APIs (GraphQL, REST, SDK) but currently lacks a
single public-facing documentation surface. Inline code documentation has been
added ad hoc, and the operational playbooks for troubleshooting core workflows
are fragmented across runbooks and slack threads. This creates onboarding friction,
inconsistent API usage, and slows incident resolution.

## Decision

1. Generate public API reference documentation from source using Typedoc and
   publish a static site artifact that can be hosted from the `website/` bundle
   or any static host.
2. Enforce inline documentation on developer-facing utilities and CLI surfaces so
   generated docs stay accurate and navigable.
3. Add a consolidated troubleshooting guide covering ingestion, build, and
   authentication flows to reduce mean time to resolution for common issues.

## Rationale

- Typedoc already exists in the repository and can emit static HTML without
  adding new infrastructure dependencies.
- Centralizing troubleshooting steps reduces duplicated support effort and makes
  SRE rotations more consistent.
- Inline JSDoc coverage ties the implementation to the published reference,
  preventing drift between code and documentation.

## Consequences

- Developers should run `npm run docs:api:public` to regenerate the public
  reference before release cutoffs.
- CI pipelines should include a documentation artifact check to ensure the API
  reference and troubleshooting guides remain current.
- Future API surface changes must update inline docblocks; reviews should fail
  when public documentation cannot be regenerated cleanly.
