# Provider Conformance Harness

## Purpose

The provider conformance harness establishes a governed, provider-agnostic contract suite that
measures LLM capabilities using only legitimate API credentials. This work is aligned with the
Summit Readiness Assertion and keeps evidence in machine-readable form for governance review.
See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative readiness posture.

## What It Does

- Runs a deterministic set of contract probes (sanity, tool calls, JSON strictness, max tokens,
  streaming availability, rate-limit signaling).
- Produces a capability matrix and raw, redacted evidence artifacts.
- Never logs secrets or authorization headers; API keys are redacted to the last four characters.

## Configuration

Set providers and credentials via environment variables only:

```bash
export PROVIDERS=anthropic,openai
export ANTHROPIC_API_KEY=...            # required for anthropic
export OPENAI_API_KEY=...               # required for openai
export OPENAI_MODEL=gpt-4o-mini          # optional override
```

Optional provider-specific variables:

```bash
export AZURE_OPENAI_ENDPOINT=...
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_DEPLOYMENT=...
export ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

## Run

```bash
pnpm provider:conformance --providers anthropic,openai
```

## Outputs

Artifacts are stored under:

```
artifacts/provider-conformance/<timestamp>/
  capabilities.json
  capabilities.md
  raw/
    anthropic.jsonl
    openai.jsonl
```

## Governance Notes

- This harness does **not** implement provider identity spoofing or OAuth subscription flows.
- Any exceptions are documented as governed exceptions and must align with policy-as-code.
- Outputs are intended for Maestro/Switchboard capability negotiation and audit trails.
