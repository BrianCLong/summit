# Prompt: SecOps Autonomy Hardening

## Objective

Strengthen the Summit SecOps Autonomy scaffold to align policy, schema, runtime guards, and server ingest flow while maintaining safety-first autonomy and auditability.

## Requirements

- Update SecOps schemas to represent alert + event ingestion on incidents.
- Align policy evaluation and OPA bundle expectations with server payloads.
- Enforce runtime budget limits (steps + cost) in the agent runtime tool router.
- Use workspace package imports for shared SecOps schemas/policy types.
- Maintain audit outputs and deterministic evidence links.
- Add governance artifacts (prompt registry entry + task spec) that match the change scope.

## Scope

- packages/security-agents/\*\*
- server/src/routes/security/secops-autonomy.ts
- server/package.json
- prompts/registry.yaml
- prompts/security/secops-autonomy-hardening.md
- agents/examples/SECOPS_AUTONOMY_HARDENING.json
- .lintstagedrc.json

## Verification

- Run `node scripts/check-boundaries.cjs`.
- Capture any failures in the PR metadata.
