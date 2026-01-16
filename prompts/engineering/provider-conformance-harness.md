# Provider Conformance Harness (v1)

## Objective

Build a provider-agnostic conformance harness that runs deterministic contract checks for LLM
providers using only legitimate credentials (API keys or enterprise endpoints). The harness must
produce a machine-readable capability matrix and evidence artifacts without logging secrets or
provider auth headers.

## Scope

- libs/provider-conformance/ (core harness and adapters)
- scripts/provider-conformance.ts (CLI)
- docs/provider-conformance.md (documentation)
- .github/workflows/provider-conformance.yml (manual workflow)
- .github/workflows/ci.yml (lint/compile check)
- docs/roadmap/STATUS.json (status update)

## Non-Negotiables

- Do not implement or reference any OAuth/subscription scraping flows.
- Keep prompts tiny and neutral.
- Redact secrets; store only last 4 characters for API keys.
- Output artifacts under artifacts/provider-conformance/<timestamp>/.
