# SERA CLI Proxy Data Handling

## Classification

- Requests, prompts, and repository content are **confidential by default**.
- Upstream credentials (API keys, HF tokens, Authorization headers) are **secret**.

## Never Log

- API keys or HF tokens.
- `Authorization` headers.
- Full prompt bodies unless explicitly enabled.

## Evidence Artifacts

- Evidence artifacts are written locally under an explicit artifact directory (default:
  `artifacts/sera_proxy`).
- By default, only SHA-256 hashes of requests and responses are recorded.
- Explicit opt-in is required to capture raw request or response bodies.

## Retention

- Artifacts are local-only unless a user explicitly publishes or archives them.
- Operators must define retention durations and deletion workflows appropriate to their environment.

## Redaction

- Any upstream headers containing secrets are never persisted.
- Logs should use redaction utilities for any structured payloads.
