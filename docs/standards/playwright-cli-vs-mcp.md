# Playwright CLI vs MCP Standard (Summit)

## Readiness Assertion

This standard aligns with the Summit Readiness Assertion and dictates the future integration path for deterministic Playwright CLI skill execution. See `docs/SUMMIT_READINESS_ASSERTION.md` for the governing readiness posture.

## Purpose

Define the Summit standard for Playwright CLI skill execution and its relationship to Playwright MCP, with deterministic evidence outputs and governance-aligned constraints.

## Scope

- Applies to Summit skill execution that invokes Playwright CLI workflows.
- Non-goals: MCP agent definition regeneration (`init-agents`) is deferred pending Summit agent framework alignment.

## Grounding Claims

- ITEM:CLAIM-01 — Playwright MCP vs Playwright CLI recommends CLI+skills for agents.
- ITEM:CLAIM-02 — CLI workflows can be more token-efficient by avoiding large schema trees.
- ITEM:API-03 — `@playwright/cli` provides an agent-oriented CLI interface.
- ITEM:API-04 — Demonstrated CLI demo command flow (`open`, `type`, `press`, `check`, `screenshot`).
- ITEM:API-05 — Playwright Test Agents and MCP integration exist and remain supported.

## Standard Definitions

### Evidence IDs

- Format: `EVID:PWCLI:<run_hash>:<step>`
- `run_hash` must be a stable content hash (spec + normalized command list + allowlist + version stamp).

### Determinism Rules

1. No wall-clock timestamps in deterministic files.
2. Stable ordering for JSON keys and arrays.
3. `run_id` must be derived from `run_hash`.
4. Evidence bundle outputs must be byte-identical for identical inputs.

### Required Artifacts

- `report.json` — structured run report (deterministic fields only).
- `evidence.json` — evidence bundle entries referencing artifacts.
- `metrics.json` — performance envelope data (duration, peak RSS, artifact bytes).

### Skill Transcript

- Normalize CLI steps into a canonical transcript.
- Do not store raw DOM snapshots or credential-bearing data.

## CLI vs MCP Interop

- CLI is the default skill execution path for deterministic, token-efficient workflows.
- MCP remains a compatibility mode and can be used when CLI coverage is incomplete.
- CLI and MCP outputs must converge into the same evidence bundle schema.

## Security Constraints

- Allowlist only: restrict subcommands to `open`, `type`, `press`, `check`, `screenshot`, `wait`, `select`, and `navigate` (extend only via governed change).
- Deny-by-default domain allowlist in CI.
- Redact URL query strings in evidence outputs.

## Governance Gates

- Evidence bundle validation is mandatory before merge.
- Determinism checks must pass for any CLI evidence output.
- Budget checks: runtime, memory, and artifact size must remain within defined limits.

## MAESTRO Alignment

- MAESTRO Layers: Foundation, Data, Agents, Tools, Observability, Security.
- Threats Considered: tool abuse, prompt injection into CLI steps, evidence tampering, data exfiltration via screenshots.
- Mitigations: allowlisted command schema, domain allowlists, deterministic evidence outputs, artifact redaction rules, and evidence validation gates.

## Decision Posture

- CLI skill execution is adopted as the default deterministic path.
- MCP remains available for compatibility, with outputs normalized into evidence bundles.
- Non-goals are intentionally constrained and deferred pending Summit agent framework alignment.

